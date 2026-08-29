# NeuralFlix — Recommendation & ML Evaluation

NeuralFlix follows an uncompromising policy of **transparent, reproducible offline evaluations**.
No metric or ranking claim may be reported in documentation without an accompanying reproduction command.

---

## 1. Offline Baseline Benchmark

The benchmark below is reproducible in a clean environment by running:

```bash
python -m pipeline.evaluation.run_eval
```

### Reproducible Results Table

| Model Architecture | Split Strategy | Recall@5 | NDCG@5 | MAP@5 | Catalog Coverage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Random Baseline** | Temporal (Leave-Last-Out) | 0.8333 | 0.5126 | 0.3611 | 42.3% | Baseline |
| **Popularity Baseline** | Temporal (Leave-Last-Out) | 0.8333 | 0.8710 | 0.8333 | 42.3% | Baseline |
| **Content-Based v1** | Temporal (Leave-Last-Out) | 1.0000 | 0.6817 | 0.5639 | 42.3% | Active |
| **Taste Constellation v1** | User Controls / Additive | 0.8333 | 0.5704 | 0.4444 | 42.3% | Active Default |
| **Hybrid v3** | Content + Taste + Quality | 1.0000 | 0.5941 | 0.4250 | 42.3% | Candidate |

---

## 2. Methodology & Rules

1. **Strict Temporal Splitting**: Train < Val < Test. No random split data leakage across time.
2. **Attribution Grounding**: Every recommendation reason displayed in the UI is a direct mathematical derivative of non-zero score components.
3. **No Fabricated Personas**: Offline benchmarks are run against verified fixtures or MovieLens research splits. They are explicitly marked as offline research benchmarks, never disguised as active app users.
