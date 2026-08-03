import unittest
from metrics import recall_at_k, ndcg_at_k, mrr, catalog_coverage

class TestMetrics(unittest.TestCase):
    def test_recall_at_k(self):
        rec = [1, 2, 3, 4, 5]
        gt = {2, 5, 8}
        self.assertAlmostEqual(recall_at_k(rec, gt, 5), 2.0 / 3.0)
        
    def test_mrr(self):
        rec = [1, 2, 3]
        gt = {3}
        self.assertAlmostEqual(mrr(rec, gt), 1.0 / 3.0)

if __name__ == "__main__":
    unittest.main()
