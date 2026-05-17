import os
import time
import random
from playwright.sync_api import sync_playwright
from pypdf import PdfWriter, PdfReader

def download_and_merge_stealth(pdf_urls, output_filename="merged_moodle_docs.pdf"):
    merger = PdfWriter()
    temp_files = []

    if not os.path.exists("moodle_state.json"):
        print("Error: 'moodle_state.json' not found. Please run authenticator.py first.")
        return

    # A master try/finally block ensures that no matter how the script exits, 
    # the cleanup code at the bottom will always run.
    try:
        with sync_playwright() as p:
            print("Launching stealth network context...")
            browser = p.firefox.launch(headless=True)
            context = browser.new_context(storage_state="moodle_state.json")
            api_context = context.request

            for i, url in enumerate(pdf_urls):
                print(f"\n--- Downloading PDF {i + 1} of {len(pdf_urls)} ---")
                
                max_retries = 5
                success = False
                
                # The Retry Loop
                for attempt in range(max_retries):
                    try:
                        response = api_context.get(url, timeout=60000)
                        
                        content_type = response.headers.get("content-type", "")
                        if "application/pdf" not in content_type.lower():
                            print(f"❌ Attempt {attempt + 1}: Server did not return a PDF (Type: {content_type}).")
                            time.sleep(5)
                            continue 
                            
                        temp_filename = f"temp_moodle_doc_{i}.pdf"
                        with open(temp_filename, "wb") as f:
                            f.write(response.body())
                            
                        if os.path.getsize(temp_filename) < 1000:
                            print(f"❌ Attempt {attempt + 1}: Downloaded file is essentially empty.")
                            time.sleep(5)
                            continue 
                            
                        try:
                            PdfReader(temp_filename)
                            merger.append(temp_filename)
                            temp_files.append(temp_filename)
                            print(f"✅ Successfully downloaded, verified, and appended document {i + 1}.")
                            success = True
                            break 
                            
                        except Exception as pdf_err:
                            print(f"❌ Attempt {attempt + 1}: The downloaded file is corrupted. {pdf_err}")
                            time.sleep(5)
                            continue 
                            
                    except Exception as e:
                        print(f"❌ Attempt {attempt + 1} failed: {e}")
                        if attempt < max_retries - 1:
                            wait_time = (attempt + 1) * 5
                            print(f"Server hiccup. Retrying in {wait_time} seconds...")
                            time.sleep(wait_time)
                
                # --- OPTION 2: THE HARD ABORT ---
                if not success:
                    print(f"\n❌ CRITICAL ERROR: Giving up on document {i + 1} after {max_retries} attempts.")
                    print("Aborting the entire script and discarding downloaded files.")
                    return # This instantly exits the function and skips to the 'finally' cleanup block
                    
                # Polite delay to avoid the firewall
                if i < len(pdf_urls) - 1:
                    sleep_time = random.uniform(2.0, 5.0)
                    print(f"Waiting {sleep_time:.1f} seconds...")
                    time.sleep(sleep_time)

            browser.close()

        if len(temp_files) == 0:
            print("\n❌ No valid PDFs were downloaded. Merging canceled.")
            return

        print(f"\nMerging {len(temp_files)} valid documents into one file...")
        with open(output_filename, "wb") as output_file:
            merger.write(output_file)
        print(f"🎉 Success! Your master PDF is ready and verified: '{output_filename}'")

    except Exception as e:
        print(f"\n❌ An unexpected error occurred during execution: {e}")
        
    finally:
        # This cleanup block executes whether the script succeeds, crashes, or triggers the hard abort
        merger.close()
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                os.remove(temp_file)

# --- Your Moodle URLs ---
moodle_urls = [
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=143763&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=164327&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=172839&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=182015&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=189453&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=194154&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=200596&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=207489&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=212552&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=219780&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=224956&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=231140&redirect=1",
    "https://moodle.huji.ac.il/2025-26/mod/resource/view.php?id=236239&redirect=1"
]

download_and_merge_stealth(moodle_urls)