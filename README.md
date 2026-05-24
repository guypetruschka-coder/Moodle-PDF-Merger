# Moodle PDF Merger

A lightweight, powerful Google Chrome extension designed to help HUJI University students easily download and merge multiple PDF resources from Moodle into a single file. 

## ✨ Features
* **Auto-Grab URLs:** Instantly pull PDF links from any open Moodle tabs with the click of a button. No tedious copy-pasting required!
* **Seamless Merging:** Automatically downloads and merges all selected PDFs into one clean file.
* **Custom Filenames:** Specify exactly what you want your merged file to be called.
* **Attach Existing PDFs:** Append newly downloaded lectures directly to the end of a previously downloaded PDF document!
* **Smart Authentication:** If you hit a Moodle login wall, the extension intelligently pauses, lets you log in securely, and resumes the download.
* **Developer-Friendly UI:** A sleek dark-mode interface featuring a code-editor style text area with line numbers.

## 📥 Installation

Since this extension is not currently on the Chrome Web Store, you can install it manually using Developer Mode.

1. Download or clone this repository to your computer.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. In the top right corner, toggle the **Developer mode** switch to **ON**.
4. In the top left corner, click the **Load unpacked** button.
5. Select the folder containing these extension files (the folder with the `manifest.json` file).
6. The extension is now installed! Pin it to your toolbar for easy access.

## 🚀 How to Use

1. Log in to your university's Moodle (Note: Currently optimized for Hebrew University of Jerusalem - HUJI).
2. Browse to your course page and open the PDF resources you want to merge in **new background tabs** (e.g., `Cmd+Click` or middle-click the links).
3. Open the **Moodle PDF Merger** extension from your Chrome toolbar.
4. Click the **"🔍 Grab URLs from Open Tabs"** button. The extension will automatically find the PDFs from your open tabs and list them.
5. Review the URLs in the text box. You can manually delete any you don't want or paste additional ones.
6. Click **Download**. 
7. A progress bar will appear. Once finished, a single merged PDF will be saved to your default downloads folder!

## 🛠️ Built With
* Vanilla JavaScript, HTML, CSS
* [pdf-lib](https://pdf-lib.js.org/) - For robust client-side PDF manipulation.
