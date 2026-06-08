"""Backend tests for the FastAPI app using AAA (Arrange-Act-Assert) pattern.

Run with: pytest -q
"""

import copy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Arrange: snapshot module-level activities and restore after each test."""
    backup = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(backup)


def test_get_activities_returns_data_and_participants_list(client):
    # Arrange: (none)

    # Act
    resp = client.get("/activities")

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    participants = data["Chess Club"].get("participants")
    assert isinstance(participants, list)
    assert all(isinstance(p, str) for p in participants)


def test_post_signup_adds_participant_and_duplicate_returns_400(client):
    # Arrange
    activity = "Chess Club"
    email = "newstudent@example.com"
    path = f"/activities/{quote(activity)}/signup"
    # ensure clean start
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Act: sign up new participant
    r = client.post(path, params={"email": email})

    # Assert
    assert r.status_code == 200
    assert email in activities[activity]["participants"]

    # Act: attempt duplicate signup
    r2 = client.post(path, params={"email": email})

    # Assert: duplicate rejected
    assert r2.status_code == 400


def test_delete_unregister_removes_participant_and_returns_200(client):
    # Arrange
    activity = "Chess Club"
    email = "michael@mergington.edu"
    assert email in activities[activity]["participants"]
    path = f"/activities/{quote(activity)}/signup"

    # Act
    r = client.delete(path, params={"email": email})

    # Assert
    assert r.status_code == 200
    assert email not in activities[activity]["participants"]


def test_signup_for_nonexistent_activity_returns_404(client):
    # Arrange
    path = "/activities/NoSuchActivity/signup"

    # Act
    r = client.post(path, params={"email": "someone@example.com"})

    # Assert
    assert r.status_code == 404


def test_unregister_nonexistent_participant_returns_404(client):
    # Arrange
    activity = "Math Olympiad"
    email = "not_in_list@example.com"
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)
    path = f"/activities/{quote(activity)}/signup"

    # Act
    r = client.delete(path, params={"email": email})

    # Assert
    assert r.status_code == 404
