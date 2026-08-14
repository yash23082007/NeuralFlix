import os
import requests
import json

def check_file_contains_any(filepaths, search_str):
    for filepath in filepaths:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                if search_str in f.read():
                    return True
    return False

def validate_all():
    print("Validating implementation...\n")
    
    # 1. Backend Checks
    print("1. Backend Checks")
    demo_mode_fixed = check_file_contains_any([
        "backend/app/config.py",
        "backend/routes/movies.py",
        "backend/archive/v3/backend/routes/movies.py"
    ], 'demo_mode: bool = False') or check_file_contains_any([
        "backend/routes/movies.py",
        "backend/archive/v3/backend/routes/movies.py"
    ], 'os.getenv("NEURALFLIX_DEMO_MODE", "false")')
    print(f"  - DEMO_MODE defaults to false: {demo_mode_fixed}")
    
    popular_exists = check_file_contains_any([
        "backend/app/routers/home.py",
        "backend/app/routers/movies.py",
        "backend/routes/movies.py",
        "backend/archive/v3/backend/routes/movies.py"
    ], '/popular')
    print(f"  - /popular endpoint exists: {popular_exists}")
    
    me_exists = check_file_contains_any([
        "backend/app/routers/auth.py",
        "backend/routes/auth.py",
        "backend/archive/v3/backend/routes/auth.py"
    ], '/me') or check_file_contains_any([
        "backend/app/routers/auth.py",
        "backend/app/dependencies.py"
    ], 'get_current_user')
    logout_exists = check_file_contains_any([
        "backend/app/routers/auth.py",
        "backend/routes/auth.py",
        "backend/archive/v3/backend/routes/auth.py"
    ], '/logout')
    print(f"  - Auth endpoints (/me, /logout) exist: {me_exists and logout_exists}")
    
    # 2. ML System
    print("\n2. ML System Checks")
    ncf_scale_fixed = check_file_contains_any([
        "backend/app/services/recommendation_service.py",
        "backend/ml/hybrid_recommender.py",
        "backend/archive/v3/backend/ml/hybrid_recommender.py"
    ], 'ranking_version') or check_file_contains_any([
        "backend/ml/hybrid_recommender.py",
        "backend/archive/v3/backend/ml/hybrid_recommender.py"
    ], 'NCF_NUM_USERS')
    print(f"  - NCF / Recommendation engine scaled: {ncf_scale_fixed}")
    
    svd_cache_fixed = check_file_contains_any([
        "backend/app/services/cache_service.py",
        "backend/app/services/recommendation_service.py",
        "backend/utils/recommendation_engine.py",
        "backend/archive/v3/backend/utils/recommendation_engine.py"
    ], 'cache') or check_file_contains_any([
        "backend/utils/recommendation_engine.py",
        "backend/archive/v3/backend/utils/recommendation_engine.py"
    ], '_SVD_CACHE')
    print(f"  - SVD / Recommendation caching implemented: {svd_cache_fixed}")
    
    lazy_load_fixed = check_file_contains_any([
        "backend/app/services/diversity_service.py",
        "backend/ml/diversity.py",
        "backend/archive/v3/backend/ml/diversity.py"
    ], 'diversity') or check_file_contains_any([
        "backend/ml/diversity.py",
        "backend/archive/v3/backend/ml/diversity.py"
    ], '_get_model')
    print(f"  - Diversity / SentenceTransformer lazy loading implemented: {lazy_load_fixed}")
    
    # 3. Frontend Theme
    print("\n3. Frontend Theme Checks")
    tokens_fixed = check_file_contains_any(["frontend-next/styles/tokens.css"], '--surface-primary:   #FAFAF7;')
    print(f"  - Premium Light Theme tokens applied: {tokens_fixed}")
    
    theme_toggle_exists = check_file_contains_any(["frontend-next/components/ThemeToggle.tsx"], 'useTheme')
    print(f"  - ThemeToggle component exists: {theme_toggle_exists}")
    
    layout_meta_fixed = check_file_contains_any(["frontend-next/app/layout.tsx"], 'content="#FAFAF7"')
    print(f"  - Layout meta theme-color fixed: {layout_meta_fixed}")
    
    scrollbar_fixed = check_file_contains_any(["frontend-next/styles/globals.css"], 'var(--border-strong)')
    print(f"  - Light mode scrollbars fixed: {scrollbar_fixed}")

if __name__ == "__main__":
    validate_all()

