import os
import csv
import pytest
import requests
import logging
from datetime import datetime
from unittest.mock import patch, MagicMock
from click.testing import CliRunner
from canvasapi.exceptions import ResourceDoesNotExist, Unauthorized, Forbidden, InvalidAccessToken

from canvasapi_script import get_data, get_question, fetch_quiz_data, write_csv

@pytest.fixture
def runner():
    return CliRunner()

@patch('canvasapi_script.canvasapi.Canvas')
def test_invalid_course_id(MockCanvas, runner):
    mock_canvas = MockCanvas.return_value
    mock_canvas.get_course.side_effect = ResourceDoesNotExist("Invalid course ID")

    result = runner.invoke(get_data, [
        '--course_id', '123', 
        '--quiz_id', '456', 
        '--access_token', 'bad_token'
    ])

    assert result.exit_code != 0
    assert "Could not find Course 123. Please double check the ID in your Canvas URL." in result.output

@patch('canvasapi_script.canvasapi.Canvas')
def test_invalid_quiz_id(MockCanvas, runner):
    mock_canvas = MockCanvas.return_value
    mock_course = MagicMock()
    mock_canvas.get_course.return_value = mock_course
    mock_course.get_quiz.side_effect = ResourceDoesNotExist("Invalid quiz ID")

    result = runner.invoke(get_data, [
        '--course_id', '123', 
        '--quiz_id', '456', 
        '--access_token', 'bad_token'
    ])

    assert result.exit_code != 0
    assert "Could not find Quiz 456. Please double check the ID in your Canvas URL." in result.output

@patch('canvasapi_script.canvasapi.Canvas')
def test_invalid_access_token(MockCanvas, runner):
    mock_canvas = MockCanvas.return_value
    mock_canvas.get_course.side_effect = InvalidAccessToken("Invalid access token")

    result = runner.invoke(get_data, [
        '--course_id', '123', 
        '--quiz_id', '456', 
        '--access_token', 'bad_token'
    ])

    assert result.exit_code != 0
    assert "Your Canvas access token is invalid or blank. Please check your token and try again." in result.output

@pytest.mark.parametrize("error_type", [
    Unauthorized("Unauthorized access"), 
    Forbidden("Forbidden access")
])
@patch('canvasapi_script.canvasapi.Canvas')
def test_restricted_course(MockCanvas, runner, error_type):
    mock_canvas = MockCanvas.return_value
    mock_canvas.get_course.side_effect = error_type

    result = runner.invoke(get_data, [
        '--course_id', '123', 
        '--quiz_id', '456', 
        '--access_token', 'valid_token'
    ])

    assert result.exit_code != 0
    assert "You do not have permission to view Course 123. Please ensure your Canvas API token has the correct access level." in result.output

@pytest.mark.parametrize("error_type", [
    Unauthorized("Unauthorized access"), 
    Forbidden("Forbidden access")
])
@patch('canvasapi_script.canvasapi.Canvas')
def test_restricted_quiz(MockCanvas, runner, error_type):
    mock_canvas = MockCanvas.return_value
    mock_course = MagicMock()
    mock_canvas.get_course.return_value = mock_course
    mock_course.get_quiz.side_effect = error_type

    result = runner.invoke(get_data, [
        '--course_id', '123', 
        '--quiz_id', '456', 
        '--access_token', 'token'
    ])

    assert result.exit_code != 0
    assert "You do not have permission to view Quiz 456. Please ensure your Canvas API token has the correct access level." in result.output

@patch('canvasapi_script.canvasapi.Canvas')
def test_server_connection_error(MockCanvas, runner):
    mock_canvas = MockCanvas.return_value
    mock_canvas.get_course.side_effect = requests.exceptions.ConnectionError("Failed to connect")
    
    result = runner.invoke(get_data, [
        '--course_id', '123', 
        '--quiz_id', '456', 
        '--access_token', 'token'
    ])

    assert result.exit_code != 0
    assert "Could not connect to Canvas at https://q.utoronto.ca. The Canvas server may be down or unreachable. Please try again later." in result.output

ID = 5555
TEXT = "<p>What is the capital of France?</p><img src='paris.jpg' alt='Eiffel Tower'>"
TYPE = "multiple_choice_question"
ANSWERS = [
    {'id': 100, 'text': 'London', 'weight': 0, 'comments': 'Wrong country'},
    {'id': 101, 'text': 'Paris', 'weight': 100, 'comments': 'Correct!'},
    {'id': 102, 'text': 'Berlin', 'weight': 0, 'comments': ''}
]

dict_question = {
    'id': ID,
    'question_text': TEXT,
    'question_type': TYPE,
    'answers': ANSWERS
}

obj_question = MagicMock()
obj_question.id = ID
obj_question.question_text = TEXT
obj_question.question_type = TYPE
obj_question.answers = ANSWERS

@pytest.mark.parametrize("test_question", [dict_question, obj_question])
def test_get_question_populates_attribute(test_question):
    question_correctness = {}
    seen_question_ids = set()
    questions = {}

    get_question(
        q=test_question, 
        module="Test Module", 
        seen_question_ids=seen_question_ids, 
        question_correctness=question_correctness, 
        questions=questions
    )

    assert 5555 in seen_question_ids
    assert question_correctness[5555] == {"num_correct": 0, "total": 0}

    assert 5555 in questions
    result = questions[5555]
    
    assert result["module_title"] == "Test Module"
    assert result["question_type"] == "multiple_choice_question"

    assert result["question_text"] == "<p>What is the capital of France?</p>"
    assert result["question_img_url"] == "paris.jpg"
    assert result["question_img_alt"] == "Eiffel Tower"

    assert result["correct_ans_id"] == 101
    assert result["correct_ans_letter"] == "B"

    assert len(result["answers"]) == 3
    
    answer_b = result["answers"][1]
    assert answer_b["ans_id"] == 101
    assert answer_b["ans_text"] == "Paris"
    assert answer_b["ans_letter"] == "B"
    assert answer_b["ans_justification"] == "Correct!"

def test_duplicate_questions():
    question_correctness = {}
    seen_question_ids = set()
    questions = {}

    get_question(
        q=dict_question, 
        module="Test Module", 
        seen_question_ids=seen_question_ids, 
        question_correctness=question_correctness, 
        questions=questions
    )

    duplicate_id_question = {
        'id': 5555,
        'question_text': "Question stem should not appear",
        'question_type': "multiple_choice_question",
        'answers': []
    }

    get_question(
        q=duplicate_id_question, 
        module="Test Module 1", 
        seen_question_ids=seen_question_ids, 
        question_correctness=question_correctness, 
        questions=questions
    )

    assert len(seen_question_ids) == 1
    assert len(questions) == 1
    assert questions[5555]["module_title"] == "Test Module"
    assert questions[5555]["question_text"] == "<p>What is the capital of France?</p>"
    assert len(questions[5555]["answers"]) != 0

def test_no_image_tag():
    question_correctness = {}
    seen_question_ids = set()
    questions = {}

    dict_question = {
        'id': 6666,
        'question_text': "<p>What is the capital of Canada?</p>",
        'question_type': "multiple_choice_question",
        'answers': [
            {'id': 200, 'text': 'Ottawa', 'weight': 100, 'comments': 'Correct!'},
            {'id': 201, 'text': 'Toronto', 'weight': 0, 'comments': 'Incorrect, but often mistaken for the capital of Canada.'},
            {'id': 202, 'text': 'Québec', 'weight': 0, 'comments': 'Québec is a province!'},
            {'id': 203, 'text': 'Vancouver', 'weight': 0, 'comments': 'Incorrect.'}
        ]
    }

    get_question(
        q=dict_question, 
        module="Test Module 1", 
        seen_question_ids=seen_question_ids, 
        question_correctness=question_correctness, 
        questions=questions
    )

    assert questions[6666]["question_img_url"] == ""
    assert questions[6666]["question_img_alt"] == ""

def test_html_answer_text():
    question_correctness = {}
    seen_question_ids = set()
    questions = {}

    dict_question = {
        'id': 6666,
        'question_text': "<p>What is the capital of Canada?</p>",
        'question_type': "multiple_choice_question",
        'answers': [
            {'id': 200, 'html': 'Ottawa', 'weight': 0, 'comments_html': 'Correct!'},
        ]
    }

    get_question(
        q=dict_question, 
        module="Test Module 1", 
        seen_question_ids=seen_question_ids, 
        question_correctness=question_correctness, 
        questions=questions
    )

    assert questions[6666]["answers"][0]["ans_text"] == "Ottawa"
    assert questions[6666]["answers"][0]["ans_justification"] == "Correct!"

def make_requester_side_effect(quiz_groups, bank_title, bank_questions, submission_times):
    """Mimics ds_quiz._requester.request for the groups/item-bank endpoints."""
    def _side_effect(method, endpoint, **kwargs):
        mock_response = MagicMock()
        if endpoint.endswith('/groups'):
            mock_response.json.return_value = {'quiz_groups': quiz_groups}
        elif endpoint.startswith('question_banks/') and endpoint.endswith('/questions'):
            mock_response.json.return_value = bank_questions
        elif endpoint.startswith('question_banks/'):
            mock_response.json.return_value = {'title': bank_title}
        elif '/submissions/' in endpoint:
            quiz_sub_id = endpoint.split('/')[-1]
            time_spent = submission_times.get(int(quiz_sub_id))
            mock_response.json.return_value = {
                "quiz_submissions": [{"time_spent": time_spent}] if time_spent is not None else []
            }
        return mock_response
    return _side_effect


def configure_quiz_mock(quiz_questions=None, quiz_groups=None, bank_title=None, bank_questions=None, 
                        submissions=None, quiz_submissions=None, time_limit=None, submission_times=None):
    mock_course = MagicMock()
    mock_quiz = MagicMock()
    mock_assignment = MagicMock()

    mock_course.get_assignment.return_value = mock_assignment

    mock_quiz.title = "Test Quiz"
    mock_quiz.assignment_id = 789
    mock_quiz.time_limit = time_limit
    mock_quiz.get_questions.return_value = quiz_questions or []
    mock_quiz.get_submissions.return_value = quiz_submissions or []
    mock_quiz._requester.request.side_effect = make_requester_side_effect(quiz_groups or [], bank_title, bank_questions or [], submission_times or {})

    mock_assignment.get_submissions.return_value = submissions or []

    return mock_course, mock_quiz

def test_item_bank_questions_added():
    bank_question = {
        'id': 4444,
        'question_text': "<p>Item bank question</p>",
        'question_type': "multiple_choice_question",
        'answers': [
            {'id': 100, 'text': 'Option A', 'weight': 100, 'comments': 'Correct!'},
            {'id': 200, 'text': 'Option B', 'weight': 0, 'comments': ''}
        ]
    }

    mock_course, mock_quiz = configure_quiz_mock(
        quiz_questions=[],
        quiz_groups=[{'assessment_question_bank_id': 999}],
        bank_title="Item Bank One",
        bank_questions=[bank_question],
    )

    questions, _ = fetch_quiz_data(123, 456, mock_course, mock_quiz)

    assert 4444 in questions
    assert questions[4444]["module_title"] == "Item Bank One"
    assert questions[4444]["correct_ans_id"] == 100
    assert questions[4444]["answers"][0]["ans_id"] == 100
    assert questions[4444]["answers"][0]["ans_text"] == "Option A"
    assert questions[4444]["correct_ans_letter"] == "A"

def test_unsubmitted_students_are_skipped():
    quiz_question = {
        'id': 1111, 'question_text': "<p>Question</p>", 'question_type': "multiple_choice_question",
        'answers': [{'id': 100, 'text': 'A', 'weight': 100, 'comments': ''}]
    }

    unsubmitted_student = MagicMock()
    unsubmitted_student.workflow_state = 'unsubmitted'
    unsubmitted_student.submission_history = [
        {'attempt': 1, 'submission_data': [{'question_id': 1111, 'correct': False}]}
    ]

    submitted_student = MagicMock()
    submitted_student.workflow_state = 'submitted'
    submitted_student.submission_history = [
        {'attempt': 1, 'submission_data': [{'question_id': 1111, 'correct': True}]}
    ]

    mock_course, mock_quiz = configure_quiz_mock(quiz_questions=[quiz_question], submissions=[unsubmitted_student, submitted_student])

    _, question_correctness = fetch_quiz_data(123, 456, mock_course, mock_quiz)

    assert question_correctness[1111] == {"num_correct": 1, "total": 1}

def test_only_first_attempt_counts_towards_correctness():
    quiz_question = {
        'id': 1111, 'question_text': "<p>Question</p>", 'question_type': "multiple_choice_question",
        'answers': [{'id': 100, 'text': 'A', 'weight': 100, 'comments': ''}]
    }

    student = MagicMock()
    student.workflow_state = 'submitted'
    student.submission_history = [
        {'attempt': 1, 'submission_data': [{'question_id': 1111, 'correct': False}]},
        {'attempt': 2, 'submission_data': [{'question_id': 1111, 'correct': True}]}
    ]

    mock_course, mock_quiz = configure_quiz_mock(quiz_questions=[quiz_question], submissions=[student])

    _, question_correctness = fetch_quiz_data(123, 456, mock_course, mock_quiz)

    assert question_correctness[1111] == {"num_correct": 0, "total": 1}

def test_response_for_deleted_question_is_skipped():
    quiz_question = {
        'id': 1111, 'question_text': "<p>Question</p>", 'question_type': "multiple_choice_question",
        'answers': [{'id': 100, 'text': 'A', 'weight': 100, 'comments': ''}]
    }

    student = MagicMock()
    student.workflow_state = 'submitted'
    student.submission_history = [
        {'attempt': 1, 'submission_data': [{'question_id': 1111, 'correct': False}, {'question_id': 2222, 'correct': True}]},
    ]

    mock_course, mock_quiz = configure_quiz_mock(quiz_questions=[quiz_question], submissions=[student])

    questions, question_correctness = fetch_quiz_data(123, 456, mock_course, mock_quiz)

    assert question_correctness[1111] == {"num_correct": 0, "total": 1}
    assert 2222 not in question_correctness
    assert 1111 in questions
    assert 2222 not in questions

FIXED_NOW = datetime(2024, 1, 1, 12, 0, 0)

def configure_full_canvas_mock(mock_canvas, **kwargs):

    mock_course, mock_quiz = configure_quiz_mock(**kwargs)

    mock_canvas.get_course.return_value = mock_course
    mock_course.get_quiz.return_value = mock_quiz

    return mock_course, mock_quiz

@patch('canvasapi_script.canvasapi.Canvas')
@patch('canvasapi_script.datetime')
def test_success_message_shown(MockDatetime, MockCanvas, runner):
    MockDatetime.now.return_value = FIXED_NOW
    mock_canvas = MockCanvas.return_value

    quiz_question = {
        'id': 1111, 'question_text': "<p>Question</p>", 'question_type': "multiple_choice_question",
        'answers': [{'id': 100, 'text': 'A', 'weight': 100, 'comments': ''}]
    }

    configure_full_canvas_mock(mock_canvas, quiz_questions=[quiz_question])

    formatted_time = FIXED_NOW.strftime('%Y%m%d_%H%M%S')

    with runner.isolated_filesystem():
        result = runner.invoke(get_data, ['--course_id', 123, '--quiz_id', 456, '--access_token', 'token' ])

        assert result.exit_code == 0, result.output
        assert result.output.strip() == f"Success! Quiz data successfully exported to canvas_quiz_456_export_{formatted_time}.csv"

@patch('canvasapi_script.canvasapi.Canvas')
@patch('canvasapi_script.datetime')
def test_csv_file_created(MockDatetime, MockCanvas, runner):
    MockDatetime.now.return_value = FIXED_NOW
    mock_canvas = MockCanvas.return_value
 
    quiz_question = {
        'id': 1111, 'question_text': "<p>Question</p>", 'question_type': "multiple_choice_question",
        'answers': [{'id': 100, 'text': 'A', 'weight': 100, 'comments': ''}]
    }
 
    configure_full_canvas_mock(mock_canvas, quiz_questions=[quiz_question])

    formatted_time = FIXED_NOW.strftime('%Y%m%d_%H%M%S')
 
    with runner.isolated_filesystem():
        result = runner.invoke(get_data, ['--course_id', 123, '--quiz_id', 456, '--access_token', 'token' ])
 
        assert result.exit_code == 0, result.output
        assert os.path.exists(f"canvas_quiz_456_export_{formatted_time}.csv")

def test_correct_csv_headers(runner):
    questions = {
        1111: {
            "module_title": "Module 1",
            "question_text": "<p>Question</p>",
            "question_type": "multiple_choice_question",
            "question_img_url": "",
            "question_img_alt": "",
            "correct_ans_letter": "A",
            "irt_a": 0, "irt_b": 0, "irt_c": 0.33,
            "answers": [
                {"ans_id": 1, "ans_text": "Option A", "ans_letter": "A", "ans_justification": ""},
                {"ans_id": 2, "ans_text": "Option B", "ans_letter": "B", "ans_justification": ""},
                {"ans_id": 3, "ans_text": "Option C", "ans_letter": "C", "ans_justification": ""},
            ]
        }
    }
 
    with runner.isolated_filesystem():
        output_filename = "canvas_quiz_456_export.csv"
        write_csv(output_filename=output_filename, max_answers=3, questions=questions)
 
        with open(output_filename, newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            headers = reader.fieldnames
 
        expected_headers = [
            "lecture", "question_id", "question", "question_type",
            "question_figure", "question_img_alt", "correct_answer",
            "irt_a", "irt_b", "irt_c",
            "answer_a", "answer_justification_a",
            "answer_b", "answer_justification_b",
            "answer_c", "answer_justification_c",
        ]
 
        assert headers == expected_headers

def test_auto_submit_warning_logged(caplog):
    quiz_question = {
        'id': 1111, 'question_text': "<p>Question</p>", 'question_type': "multiple_choice_question",
        'answers': [{'id': 100, 'text': 'A', 'weight': 100, 'comments': ''}]
    }

    submission = MagicMock()
    submission.id = 999
    submission.user_id = 1
    submission.user = {'name': 'Jane Doe'}
    submission.workflow_state = 'submitted'
    submission.submission_history = [{'attempt': 1, 'submission_data': [{'question_id': 1111, 'correct': True, 'answer_id': 1}]}]

    quiz_sub = MagicMock()
    quiz_sub.user_id = 1
    quiz_sub.id = 555

    mock_course, mock_quiz = configure_quiz_mock(
        quiz_questions=[quiz_question],
        submissions=[submission],
        quiz_submissions=[quiz_sub],
        time_limit=1,
        submission_times={555: 65},
    )

    with caplog.at_level(logging.WARNING):
        fetch_quiz_data(123, 456, mock_course, mock_quiz)

    assert "Submission 999 for Jane Doe was auto-submitted after exceeding the allowed time limit." in caplog.text


def test_unanswered_submission_warning_logged(caplog):
    quiz_question = {
        'id': 1111, 'question_text': "<p>Question</p>", 'question_type': "multiple_choice_question",
        'answers': [{'id': 100, 'text': 'A', 'weight': 100, 'comments': ''}]
    }

    submission = MagicMock()
    submission.id = 888
    submission.user_id = 2
    submission.user = {'name': 'John Smith'}
    submission.workflow_state = 'submitted'
    submission.submission_history = [
        {'attempt': 1, 'submission_data': [{'question_id': 1111, 'correct': False}]}
    ]

    mock_course, mock_quiz = configure_quiz_mock(
        quiz_questions=[quiz_question],
        submissions=[submission],
        quiz_submissions=[], # No matching quiz submission so it's guaranteed that the auto-submit warning isn't generated
        time_limit=None,
    )

    with caplog.at_level(logging.WARNING):
        fetch_quiz_data(123, 456, mock_course, mock_quiz)

    assert "All questions in submission 888 for John Smith are unanswered." in caplog.text
