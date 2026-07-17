# /// script
# requires-python = ">=3.13"
# dependencies = [
#   "requests",
#   "canvasapi",
#   "click",
#   "scipy",
#   "beautifulsoup4",
# ]
# ///

import requests
import math
import logging
import csv
import canvasapi
import click
import os
import scipy.stats as stats
from canvasapi.course import Course
from canvasapi.quiz import Quiz
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Any
from canvasapi.exceptions import ResourceDoesNotExist, Unauthorized, Forbidden, InvalidAccessToken

ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

def get_question(
    q: dict | Any, 
    module: str, 
    seen_question_ids: set[int], 
    question_correctness: dict[int, dict[str, int]], 
    questions: dict[int, dict[str, Any]]
) -> None:
    """
    Extracts question details, handles HTML parsing for images, and initializes question attributes in the tracking dictionaries.

    Args:
        q (dict | Any): The question object or dictionary from Canvas API.
        module (str): The title of the quiz or item bank the question belongs to.
        seen_question_ids (set[int]): A set of already processed question IDs to prevent duplicates.
        question_correctness (dict[int, dict[str, int]]): Dictionary tracking the number of correct answers and total attempts per question.
        questions (dict[int, dict[str, Any]]): Dictionary storing parsed question data, answer data, and irt parameters.
        
    Returns:
        None
    """
    is_dict = isinstance(q, dict)

    q_id = q.get('id') if is_dict else q.id
    q_stem = q.get('question_text') if is_dict else q.question_text
    q_question_type = q.get('question_type') if is_dict else q.question_type
    answers = q.get('answers', []) if is_dict else q.answers

    if q_id in seen_question_ids: # Ensures we don't pull duplicate questions from item banks 
        return

    seen_question_ids.add(q_id)
    question_correctness[q_id] = {"num_correct": 0, "total": 0}

    img_url = ""
    img_alt = ""
    
    if q_stem:
        q_stem_text = BeautifulSoup(q_stem, 'html.parser')
        
        img_tag = q_stem_text.find('img')
        
        if img_tag:
            img_url = img_tag.get('src', '')
            img_alt = img_tag.get('alt', '')

            img_tag.decompose() 
            
            q_stem = str(q_stem_text)

    questions[q_id] = {
        "module_title": module,
        "question_text": q_stem,
        "question_type": q_question_type,
        "question_img_url": img_url,
        "question_img_alt": img_alt,
        "correct_ans_id": "",
        "correct_ans_letter": "",
        "irt_a": 0.0,
        "irt_b": 0.0,
        "irt_c": 0.0,
        "answers": []
    }

    answer_counter = 0

    for a in answers:
        ans_content = a.get('text') or a.get('html')
        ans_feedback = a.get('comments') or a.get('comments_html')
        
        current_answer_dict = {
            "ans_id": a.get('id'),
            "ans_text": ans_content,
            "ans_letter": ALPHABET[answer_counter],
            "ans_justification": ans_feedback
        }
        
        questions[q_id]["answers"].append(current_answer_dict)
        
        if a.get('weight') == 100:
            questions[q_id]["correct_ans_id"] = a.get('id')
            questions[q_id]["correct_ans_letter"] = ALPHABET[answer_counter]

        answer_counter += 1

 
def tally_submission_correctness(
    course_id: int, 
    quiz_id: int, 
    course: Course, 
    quiz: Quiz, 
    questions: dict[int, dict[str, Any]], 
    question_correctness: dict[int, dict[str, int]]
) -> None:
    """
    Fetches each student's first-attempt submission data and tallies correctness 
    per question into `question_correctness`.
    
    Logs 2 potential data-quality issues: submissions that were auto-submitted 
    after exceeding the time limit, and submissions where no questions were answered.

    Args:
        course_id (int): The ID of the Canvas course.
        quiz_id (int): The ID of the Canvas quiz.
        course (Any): The Canvas course object from Canvas API.
        quiz (Any): The Canvas quiz object from Canvas API.
        questions (dict[int, dict[str, Any]]): Dictionary storing parsed question data, answer data, and irt parameters.
        question_correctness (dict[int, dict[str, int]]): Dictionary tracking the number of correct answers and total attempts per question.

    Returns:
        None
    """
    assignment_id = quiz.assignment_id
    quiz_assignment = course.get_assignment(assignment_id)
    all_submissions = quiz_assignment.get_submissions(include=['submission_history', 'user'])
 
    quiz_subs = quiz.get_submissions()
    qs_id_map = {qs.user_id: qs.id for qs in quiz_subs}
 
    if quiz.time_limit:
        quiz_time_limit = quiz.time_limit * 60
    else:
        quiz_time_limit = None
 
    for student_sub in all_submissions:
        has_submitted_q = False
 
        if student_sub.workflow_state == 'unsubmitted': 
            continue
                    
        if hasattr(student_sub, 'submission_history'):
            seen_attempts = set()
            for attempt in student_sub.submission_history:
                if attempt is None:
                    continue
 
                if attempt.get("attempt") in seen_attempts: # Track seens attempt numbers b/c sometimes canvas records an attempt twice (specificallly if it contains a question that can't be auto-graded, eg. essay response)
                    continue
 
                seen_attempts.add(attempt.get("attempt"))

                if (attempt.get("attempt") != 1):
                    continue
 
                q_sub_id = qs_id_map.get(student_sub.user_id)
                if q_sub_id:
                    response = quiz._requester.request(
                        "GET",
                        f"courses/{course_id}/quizzes/{quiz_id}/submissions/{q_sub_id}",
                        attempt=1 
                    )
 
                    sub_list = response.json().get("quiz_submissions", [])
                    if (len(sub_list) > 0):
                        submission_time = sub_list[0].get("time_spent")
 
                if (quiz_time_limit and submission_time and submission_time >= quiz_time_limit):
                    logging.warning(f"Submission {student_sub.id} for {student_sub.user.get('name')} was auto-submitted after exceeding the allowed time limit.")
                
                for response in attempt.get('submission_data', []):
                    if ('answer_id' in response):
                        has_submitted_q = True
 
                    q_id = response.get('question_id')
 
                    if (q_id not in questions):
                        continue # Handles case where a student answers a question, but then the question has been deleted from the quiz
 
                    is_correct = response.get('correct')
 
                    if is_correct: question_correctness[q_id]["num_correct"] += 1
                    question_correctness[q_id]["total"] += 1
 
        if (has_submitted_q == False):
            logging.warning(f"All questions in submission {student_sub.id} for {student_sub.user.get('name')} are unanswered.")
 
 
def compute_irt_parameters(questions: dict[int, dict[str, Any]], question_correctness: dict[int, dict[str, int]]) -> None:
    """
    Calculates IRT a, b, and c parameters for each question from the correctness tallies in `question_correctness`.

    Args:
        questions (dict[int, dict[str, Any]]): Dictionary containing parsed question data to be updated with IRT parameters.
        question_correctness (dict[int, dict[str, int]]): Dictionary tracking the number of correct answers and total attempts per question.

    Returns:
        None
    """
    for q_id, stats_dict in question_correctness.items():
        if stats_dict.get('total') == 0 or stats_dict.get('total') is None:
            continue
 
        percentile = (stats_dict.get('num_correct') / stats_dict.get('total'))
        safe_percentile = max(0.001, min(0.999, percentile)) # To prevent -inf or inf irt_b values
 
        z_score = stats.norm.ppf(safe_percentile)
 
        irt_a = 0.3 / (math.sqrt(1 - (0.3 ** 2))) # Biserial is set to 0.3 for now, will need to update to actual value when we get the calculation for it
        irt_b = -z_score
 
        if (len(questions.get(q_id).get('answers')) == 0):
            irt_c = None
        else:
            irt_c = 1.0 / len(questions.get(q_id).get('answers'))

        questions[q_id]["irt_a"] = irt_a
        questions[q_id]["irt_b"] = irt_b
        questions[q_id]["irt_c"] = irt_c

def fetch_quiz_data(
    course_id: int, 
    quiz_id: int, 
    course: Course, 
    quiz: Quiz
) -> tuple[dict[int, dict[str, Any]], dict[int, dict[str, int]]]:
    """
    Orchestrates the retrieval of all questions from a specific quiz and its 
    associated item banks. Also triggers tallying for question correctness and IRT calculations.

    Args:
        course_id (int): The ID of the Canvas course.
        quiz_id (int): The ID of the Canvas quiz.
        course (Any): The Canvas course object from Canvas API.
        quiz (Any): The Canvas quiz object from Canvas API.

    Returns:
        tuple[dict[int, dict[str, Any]], dict[int, dict[str, int]]]: A tuple containing the parsed 
        questions dictionary and the question_correctness tracking dictionary.
    """
    quiz_questions = quiz.get_questions();

    question_correctness = {}
    seen_question_ids = set()
    questions = {}

    for q in quiz_questions:
        get_question(q, quiz.title, seen_question_ids, question_correctness, questions)

    groups_response = quiz._requester.request( # Gets a list of question groups in a quiz
        "GET",
        f"courses/{course_id}/quizzes/{quiz_id}/groups"
    )

    question_groups = groups_response.json().get('quiz_groups')

    item_bank_ids = []

    for group in question_groups:
        current_id = group.get('assessment_question_bank_id')
        if current_id not in item_bank_ids: item_bank_ids.append(group.get('assessment_question_bank_id'))

    for item_bank_id in item_bank_ids:
        if item_bank_id is None: # Question groups within a canvas quiz have no item bank id, but its questions are still parsed normally so we can skip to the next iteration
            continue

        item_bank = quiz._requester.request( # Returns an assessment question bank object, which you can't get questions from, so you have to also make the next request
            "GET",
            f"question_banks/{item_bank_id}"
        )

        bank_questions = quiz._requester.request(
            "GET",
            f"question_banks/{item_bank_id}/questions"
        )

        bank_title = item_bank.json().get('title')

        for q in bank_questions.json():
            get_question(q, bank_title, seen_question_ids, question_correctness, questions)

    tally_submission_correctness(course_id, quiz_id, course, quiz, questions, question_correctness)
    compute_irt_parameters(questions, question_correctness)

    return questions, question_correctness

def write_csv(output_filename: str, max_answers: int, questions: dict[int, dict[str, Any]]) -> None:
    """
    Writes the extracted question data and computed parameters into a CSV file.

    Args:
        output_filename (str): The name of the CSV file.
        max_answers (int): The maximum number of answer choices across all questions (to generate file headers).
        questions (dict[int, dict[str, Any]]): The fully processed questions dictionary containing parsed question data, answer data, and irt parameters.

    Returns:
        None
    """
    csv_headers = [
        "lecture",
        "question_id",
        "question",
        "question_type",
        "question_figure",
        "question_img_alt",
        "correct_answer",
        "irt_a",
        "irt_b",
        "irt_c",
    ]

    for i in range(max_answers):
        letter = ALPHABET[i].lower() 
        csv_headers.append(f"answer_{letter}")
        csv_headers.append(f"answer_justification_{letter}")

    with open(output_filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=csv_headers)
        writer.writeheader()

        for q_id, q_data in questions.items():
            row = {
                "lecture": q_data.get("module_title"),
                "question_id": q_id,
                "question": q_data.get("question_text"),
                "question_type": q_data.get("question_type"),
                "question_figure": q_data.get("question_img_url"),
                "question_img_alt": q_data.get("question_img_alt"),
                "correct_answer": q_data.get("correct_ans_letter"),
                "irt_a": q_data.get("irt_a"),
                "irt_b": q_data.get("irt_b"),
                "irt_c": q_data.get("irt_c"),
            }

            for i in range(max_answers):
                letter = ALPHABET[i].lower()
                ans_key = f"answer_{letter}"
                just_key = f"answer_justification_{letter}"

                if i < len(q_data.get("answers", [])):
                    ans = q_data.get("answers")[i]
                    row[ans_key] = ans.get("ans_text")
                    row[just_key] = ans.get("ans_justification")
                else:
                    row[ans_key] = ""
                    row[just_key] = ""

            writer.writerow(row)

@click.command()
@click.option('--course_id', prompt='Course ID', type=int,
              help='The ID of the course on Canvas. Found in the browser URL: eg. https://q.utoronto.ca/courses/121212 has Course ID 121212')
@click.option('--quiz_id', prompt='Quiz ID', type=int,
              help='The ID of the quiz on Canvas. Found in the browser URL: eg. https://q.utoronto.ca/courses/121212/quizzes/232323 has Quiz ID 232323')

def get_data(course_id: int, quiz_id: int) -> None:
    """
    Main CLI entry point. Initializes a Canvas API connection, retrieves data for 
    the specified course and quiz, and exports the data to a CSV file.

    Args:
        course_id (int): The ID of the course on Canvas.
        quiz_id (int): The ID of the quiz on Canvas.
        access_token (str): Valid Canvas API access token.

    Raises:
        click.ClickException: Handles exceptions resulting from missing attributes,
        forbidden access, invalid tokens, or network issues.
        
    Returns:
        None
    """
    API_URL = "https://q.utoronto.ca"

    access_token = click.prompt(
        'Canvas Access Token (For security, nothing will be displayed on the screen while you type or paste your token)', 
        hide_input=True
    )

    # Initialize a new Canvas object
    canvas = canvasapi.Canvas(API_URL, access_token)

    try:
        course = canvas.get_course(course_id)
    except ResourceDoesNotExist:
        raise click.ClickException(
            f"Could not find Course {course_id}. "
            "Please double check the ID in your Canvas URL."
        )
    except (Unauthorized, Forbidden):
        raise click.ClickException(
            f"You do not have permission to view Course {course_id}. "
            "Please ensure your Canvas API token has the correct access level."
        )
    except InvalidAccessToken:
        raise click.ClickException(
            "Your Canvas access token is invalid or blank. Please check your token and try again."
        )
    except requests.exceptions.RequestException:
        raise click.ClickException(
            f"Could not connect to Canvas at {API_URL}. "
            "The Canvas server may be down or unreachable. Please try again later."
        )
    
    try:
        quiz = course.get_quiz(quiz_id)
    except ResourceDoesNotExist:
        raise click.ClickException(
            f"Could not find Quiz {quiz_id}. "
            "Please double check the ID in your Canvas URL."
        )
    except (Unauthorized, Forbidden):
        raise click.ClickException(
            f"You do not have permission to view Quiz {quiz_id}. "
            "Please ensure your Canvas API token has the correct access level."
        )
    except requests.exceptions.RequestException:
        raise click.ClickException(
            f"Could not connect to Canvas at {API_URL}. "
            "The Canvas server may be down or unreachable. Please try again later."
        )

    questions, question_correctness = fetch_quiz_data(course_id, quiz_id, course, quiz)

    max_answers = 0
    for q_data in questions.values():
        if len(q_data.get("answers", [])) > max_answers:
            max_answers = len(q_data["answers"])

    output_filename = f"canvas_quiz_{quiz_id}_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
    write_csv(output_filename, max_answers, questions)

    full_path = os.path.abspath(output_filename)

    click.secho(message=f"Success! Quiz data successfully exported to {full_path}", err=False, fg="green")

if __name__ == '__main__':
    get_data()
