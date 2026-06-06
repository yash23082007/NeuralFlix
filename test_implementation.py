import os
import requests
import json

def check_file_contains(filepath, search_str):
    if not os.path.exists(filepath):
        return False
    with open(filepath, 'r', encoding='utf-8') as f:
        return search_str in f.read()

def validate_all():
    print("Validating implementation...\n")
    
    # 1. Backend Fixes
    print("1. Backend Checks")
    demo_mode_fixed = check_file_contains("backend/routes/movies.py", 'os.getenv("NEURALFLIX_DEMO_MODE", "false")')
    print(f"  - DEMO_MODE defaults to false: {demo_mode_fixed}")
    
    popular_exists = check_file_contains("backend/routes/movies.py", '@router.get("/popular")')
    print(f"  - /popular endpoint exists: {popular_exists}")
    
    me_exists = check_file_contains("backend/routes/auth.py", 'def get_current_user')
    logout_exists = check_file_contains("backend/routes/auth.py", 'def logout')
    print(f"  - Auth endpoints (/me, /logout) exist: {me_exists and logout_exists}")
    
    # 2. ML System
    print("\n2. ML System Checks")
    ncf_scale_fixed = check_file_contains("backend/ml/hybrid_recommender.py", 'NCF_NUM_USERS", "50000"') and \
                      check_file_contains("backend/ml/hybrid_recommender.py", 'NCF_NUM_ITEMS", "15000"')
    print(f"  - NCF scaled to 15,000 items: {ncf_scale_fixed}")
    
    svd_cache_fixed = check_file_contains("backend/utils/recommendation_engine.py", '_SVD_CACHE') or \
                      check_file_contains("backend/utils/recommendation_engine.py", '_SVD_MODEL')
    print(f"  - SVD caching implemented: {svd_cache_fixed}")
    
    lazy_load_fixed = check_file_contains("backend/ml/diversity.py", 'def _get_model():')
    print(f"  - SentenceTransformer lazy loading implemented: {lazy_load_fixed}")
    
    # 3. Frontend Theme
    print("\n3. Frontend Theme Checks")
    tokens_fixed = check_file_contains("frontend-next/styles/tokens.css", '--surface-primary:   #FAFAF7;')
    print(f"  - Premium Light Theme tokens applied: {tokens_fixed}")
    
    theme_toggle_exists = check_file_contains("frontend-next/components/ThemeToggle.tsx", 'useTheme')
    print(f"  - ThemeToggle component exists: {theme_toggle_exists}")
    
    layout_meta_fixed = check_file_contains("frontend-next/app/layout.tsx", 'content="#FAFAF7"')
    print(f"  - Layout meta theme-color fixed: {layout_meta_fixed}")
    
    scrollbar_fixed = check_file_contains("frontend-next/styles/globals.css", 'var(--border-strong)')
    print(f"  - Light mode scrollbars fixed: {scrollbar_fixed}")

if __name__ == "__main__":
    validate_all()
