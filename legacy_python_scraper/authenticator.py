from playwright.sync_api import sync_playwright

def login_and_save_session(moodle_login_url):
    with sync_playwright() as p:
        # THIS is the crucial line that forces Firefox instead of Chromium
        browser = p.firefox.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        print(f"Opening {moodle_login_url}...")
        page.goto(moodle_login_url)
        
        print("\n*** ACTION REQUIRED ***")
        print("1. Log in to Moodle in the browser window.")
        print("2. Complete your Multi-Factor Authentication.")
        print("3. Wait until you see your Moodle dashboard or the PDF page.")
        
        # The script pauses here until you give it the green light
        input("\nPress ENTER here in the terminal ONLY AFTER you are fully logged in...")
        
        # Save the authentication state (cookies, local storage) to a file
        context.storage_state(path="moodle_state.json")
        print("\nSuccess! Session saved to 'moodle_state.json'.")
        
        browser.close()

# Going directly to a protected file forces Moodle to trigger the SSO login page
LOGIN_URL = "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=143763"

login_and_save_session(LOGIN_URL)