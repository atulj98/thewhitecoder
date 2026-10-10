from pathlib import Path

from app.content_manifest import load_manifest


def test_every_dsa_topic_has_a_direct_problem_link():
    path = Path(__file__).resolve().parents[2] / "content/published/dsa.json"
    manifest = load_manifest(path)
    assert len(manifest.steps) == 23
    topics = [topic for step in manifest.steps for topic in step.topics]
    assert topics
    for topic in topics:
        questions = [item for item in topic.items if item.kind == "practice"]
        assert questions, topic.title
        for question in questions:
            assert question.source_url is not None, question.title
            assert question.source_url.host in {
                "leetcode.com",
                "www.geeksforgeeks.org",
                "codeforces.com",
            }, question.title
