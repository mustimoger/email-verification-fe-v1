import asyncio

from app.api import tasks as tasks_module
from app.clients.external import Task, TaskListResponse


class FakeClient:
    def __init__(self, results):
        self.results = results
        self.calls = 0

    async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
        self.calls += 1
        idx = min(self.calls - 1, len(self.results) - 1)
        return self.results[idx]


def test_poll_tasks_after_upload_stops_on_new_task(monkeypatch):
    captured = []

    monkeypatch.setattr(
        tasks_module,
        "upsert_tasks_from_list",
        lambda user_id, tasks, integration=None: captured.append((user_id, integration, [task.id for task in tasks])),
    )

    client = FakeClient(
        [
            TaskListResponse(tasks=[Task(id="t1")], count=1),
            TaskListResponse(tasks=[Task(id="t1"), Task(id="t2")], count=2),
        ]
    )

    asyncio.run(
        tasks_module.poll_tasks_after_upload(
            client=client,
            user_id="user-1",
            integration="dashboard_api",
            attempts=3,
            interval_seconds=0,
            page_size=5,
            baseline_ids={"t1"},
        )
    )

    # Should have stopped once the new task appeared and upserted latest list
    assert client.calls == 2
    assert captured[-1] == ("user-1", "dashboard_api", ["t1", "t2"])


def test_poll_tasks_after_upload_handles_no_new_tasks(monkeypatch):
    calls = []

    monkeypatch.setattr(
        tasks_module,
        "upsert_tasks_from_list",
        lambda user_id, tasks, integration=None: calls.append((user_id, integration, [task.id for task in tasks])),
    )

    client = FakeClient(
        [
            TaskListResponse(tasks=[Task(id="a")], count=1),
            TaskListResponse(tasks=[Task(id="a")], count=1),
        ]
    )

    asyncio.run(
        tasks_module.poll_tasks_after_upload(
            client=client,
            user_id="user-2",
            integration="dashboard_api",
            attempts=2,
            interval_seconds=0,
            page_size=5,
            baseline_ids={"a"},
        )
    )

    # Should exhaust attempts when no new ids appear
    assert client.calls == 2
    assert calls[-1] == ("user-2", "dashboard_api", ["a"])
