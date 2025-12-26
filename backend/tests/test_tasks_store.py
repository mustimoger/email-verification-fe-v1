from app.clients.external import TaskResponse
from app.services import tasks_store


class FakeTable:
    def __init__(self) -> None:
        self.rows = None
        self.on_conflict = None

    def upsert(self, rows, on_conflict=None):
        self.rows = rows
        self.on_conflict = on_conflict
        return self

    def execute(self):
        return {"data": self.rows}


class FakeSupabase:
    def __init__(self) -> None:
        self.table_name = None
        self.table_obj = FakeTable()

    def table(self, name: str):
        self.table_name = name
        return self.table_obj


def test_upsert_tasks_from_list_accepts_task_response(monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr(tasks_store, "get_supabase", lambda: fake)

    task = TaskResponse(id="task-1", email_count=3)
    tasks_store.upsert_tasks_from_list("user-1", [task])

    assert fake.table_name == "tasks"
    assert isinstance(fake.table_obj.rows, list)
    assert len(fake.table_obj.rows) == 1
    row = fake.table_obj.rows[0]
    assert row["task_id"] == "task-1"
    assert row["user_id"] == "user-1"
    assert row["email_count"] == 3
    assert "valid_count" not in row
    assert "invalid_count" not in row
    assert "catchall_count" not in row


def test_normalize_status_from_job_status_processing():
    assert tasks_store.normalize_status_from_job_status(None, {"pending": 2}) == "processing"


def test_normalize_status_from_job_status_completed():
    assert tasks_store.normalize_status_from_job_status("processing", {"completed": 5}) == "completed"


def test_normalize_status_from_job_status_failed():
    assert tasks_store.normalize_status_from_job_status("processing", {"failed": 1}) == "failed"
