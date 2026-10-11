from pathlib import Path

from app.content_manifest import load_manifest


def test_dsa_practice_path_is_complete_and_directly_linked():
    path = Path(__file__).resolve().parents[2] / "content/published/dsa.json"
    manifest = load_manifest(path)
    assert len(manifest.steps) == 24
    topics = [topic for step in manifest.steps for topic in step.topics]
    assert len(topics) == 102
    assert sum(item.kind == "practice" for topic in topics for item in topic.items) == 241
    assert [step.stable_key for step in manifest.steps][14:17] == [
        "binary-search-tree",
        "combinatorics",
        "heaps",
    ]
    for topic in topics:
        questions = [item for item in topic.items if item.kind == "practice"]
        assert len(questions) >= 2, topic.title
        assert topic.items[0].kind == "concept", topic.title
        for question in questions:
            assert question.source_url is not None, question.title
            assert question.content_url is None, question.title
            assert question.source_url.host in {
                "leetcode.com",
                "www.geeksforgeeks.org",
                "codeforces.com",
            }, question.title

    dp = manifest.steps[18]
    assert dp.stable_key == "dynamic-programming"
    assert len(dp.topics) == 7
    assert all(
        sum(item.kind == "practice" for item in topic.items) == 3 for topic in dp.topics[:-1]
    )
    assert dp.topics[-1].stable_key == "digit-dp"
    assert sum(item.kind == "practice" for item in dp.topics[-1].items) == 4


def test_questions_have_unique_links_except_the_intentional_two_tree_approaches():
    path = Path(__file__).resolve().parents[2] / "content/published/dsa.json"
    manifest = load_manifest(path)
    links: list[str] = []
    for step in manifest.steps:
        for topic in step.topics:
            links.extend(
                str(item.source_url)
                for item in topic.items
                if item.kind == "practice" and item.source_url is not None
            )
    duplicate_links = {link for link in links if links.count(link) > 1}
    assert duplicate_links == {"https://leetcode.com/problems/range-sum-query-mutable/"}
