import math
import canvasapi
import os
from dotenv import load_dotenv

load_dotenv()

# The course ID for sandbox
COURSE_ID = 283630
QUIZ_ID = 518767 # data structures quiz (classic)

# Canvas API URL
API_URL = "https://q.utoronto.ca"
# Canvas API key
API_KEY = os.getenv("CANVAS_ACCESS_TOKEN")

# Initialize a new Canvas object
canvas = canvasapi.Canvas(API_URL, API_KEY)

course = canvas.get_course(COURSE_ID)
print(f'Working with {course.name}')

ds_quiz = course.get_quiz(QUIZ_ID)
print(f'Working with {ds_quiz.title}')

total_attempts = {} # dict w/ question ids as keys and # of total attempts for that question as values
correct_attempts = {} # dict w/ question ids as keys and # of correct attempts for that question as values
question_names = {}
question_num_options = {} # dict w/ question ids as keys and # of answer options for that question as values

all_submissions = ds_quiz.get_submissions(include=["submission_history"])

for submission in all_submissions:
    if submission.attempt == 0 or not submission.attempt: # move on to next submission if this submission has no attempts
        continue

    print(f"\nSubmission ID: {submission.id}")
    print(f"\nFinal score: {submission.score}, final attempt: {submission.attempt}")

    # store per-attempt quiz scores
    attempt_scores = {}

    for attempt_num in range(1, submission.attempt + 1):
        attempt = ds_quiz.get_quiz_submission(
            submission.id,
            attempt=attempt_num
        )

        attempt_scores[attempt_num] = attempt.score

        print(f"\nATTEMPT {attempt_num}")

        for key, value in attempt.__dict__.items():
            print(f"{key}: {value}")

    questions = submission.get_submission_questions()

    print("\nQuestion-level correctness snapshot for latest attempt:")
    for q in questions:
        print(f"  Question {q.id}: correct={q.correct}")

    print("\nAttempt scores:")
    for a in attempt_scores:
        print(f"  Attempt {a}: score={attempt_scores[a]}")

    for question in questions:
        q_id = question.id

        if q_id not in total_attempts: # if we haven't seen this question before, add it to dicts + initialize values
            total_attempts[q_id] = 0
            correct_attempts[q_id] = 0
            question_names[q_id] = getattr(question, 'question_name', f"Question {q_id}")
            question_num_options[q_id] = len(getattr(question, "answers", []))

        total_attempts[q_id] += 1 # increment total attempts for this question
        is_correct = getattr(question, 'correct', False)

        if is_correct == True:
            correct_attempts[q_id] += 1

stats_list = ds_quiz.get_statistics(all_versions=True)

print("\nQuiz Statistics:")

for s in stats_list:
    print(s.__dict__)
    print(f"\nQuestion statistics: {s.question_statistics}")

# print(f"Quiz contains {len(total_attempts)} questions")

# for q_id in total_attempts:
#     t_attempts = total_attempts[q_id]
#     c_attempts = correct_attempts[q_id]
    
#     print(f"{question_names[q_id]} (ID: {q_id})")
#     print(f"  Total Attempts: {t_attempts}")
#     print(f"  Correct: {c_attempts}")

#     percent_correct = (c_attempts / t_attempts) * 100.0
#     percentile = (c_attempts / t_attempts)

#     irt_a = 0.3 / (math.sqrt(1 - (0.3 ** 2))) # biserial is set to 0.3 for now, will need to update to actual value when we get the calculation for it

#     irt_c = 1.0 / question_num_options[q_id]

#     print(f"  Percent Correct: {percent_correct}%")
#     print(f"  irt_a: {irt_a}")

#     print(f"  irt_c: {irt_c}")
    
#     if t_attempts > 0:
#         success_rate = (c_attempts / t_attempts) * 100
#         print(f"  Success Rate:   {success_rate:.1f}%")
#     print("-" * 30)