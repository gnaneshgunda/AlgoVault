from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime

TOPIC_TAGS = [
    "Array", "String", "Matrix", "Graph", "Tree", "Binary Tree", "Binary Search Tree",
    "N-ary Tree", "Linked List", "Math", "Geometry", "Dynamic Programming", "Strings",
    "Network Flow",
]

TECHNIQUE_TAGS = [
    "Simulation", "Sorting", "Searching", "Greedy", "Implementation",
    "Stack", "Queue", "Deque", "Hash Table", "Set", "Heap / Priority Queue",
    "Ordered Set", "Trie", "Union Find (DSU)", "Segment Tree", "Fenwick Tree",
    "Binary Indexed Tree", "Tree DP", "Lowest Common Ancestor",
    "DFS", "BFS", "Topological Sort", "Shortest Path", "Minimum Spanning Tree",
    "Strongly Connected Components", "Bridges & Articulation Points", "Euler Tour",
    "Functional Graph", "Knapsack", "Bitmask DP", "Digit DP", "Interval DP",
    "Memoization", "Prefix Sum", "Difference Array", "Sliding Window", "Two Pointers",
    "Binary Search", "Sparse Table", "Mo's Algorithm", "Number Theory", "Combinatorics",
    "Probability", "Game Theory", "Bit Manipulation", "String Matching", "KMP",
    "Z Algorithm", "Rolling Hash", "Suffix Array", "Manacher", "Palindrome",
    "Convex Hull", "Line Sweep", "Maximum Flow", "Minimum Cost Flow", "Bipartite Matching",
    "Divide & Conquer", "Backtracking", "Meet in the Middle", "Convex Hull Trick",
    "Heavy-Light Decomposition", "Centroid Decomposition", "Persistent Data Structure",
    "Interactive", "Ad Hoc", "Constructive", "Brute Force", "Recursion",
    "Offline Queries", "Online Queries",
]

DIFFICULTIES = ["Easy", "Medium", "Hard"]

class QuestionBase(BaseModel):
    original_url: str
    title: str

class QuestionCreate(QuestionBase):
    platform: Optional[str] = None
    topic_tags: Optional[List[str]] = None
    technique_tags: Optional[List[str]] = None
    difficulty: Optional[str] = None

class QuestionTagsUpdate(BaseModel):
    topic_tags: Optional[List[str]] = None
    technique_tags: Optional[List[str]] = None
    difficulty: Optional[str] = None

class QuestionResponse(QuestionBase):
    id: UUID
    submitter_id: UUID
    platform: str
    normalized_url_hash: str
    total_views: int
    total_weighted_score: float
    trending_score: float
    wilson_score: float
    created_at: datetime
    submitter_username: Optional[str] = None
    has_upvoted: bool = False
    has_saved: bool = False
    topic_tags: Optional[List[str]] = None
    technique_tags: Optional[List[str]] = None
    difficulty: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
