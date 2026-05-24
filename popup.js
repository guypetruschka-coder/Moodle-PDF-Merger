// --- LINE NUMBER LOGIC ---
const textarea = document.getElementById('urlInput');
const lineNumbers = document.getElementById('lineNumbers');

function updateLineNumbers() {
    const lines = textarea.value.split('\n').length;
    lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => i + 1).join('<br>');
}
textarea.addEventListener('input', updateLineNumbers);
textarea.addEventListener('scroll', () => { lineNumbers.scrollTop = textarea.scrollTop; });
updateLineNumbers();

// --- EXISTING PDF UI LOGIC ---
document.getElementById('existingPdfInput').addEventListener('change', (e) => {
    const fileDisplay = document.getElementById('fileNameDisplay');
    if (e.target.files.length > 0) {
        fileDisplay.innerText = `Selected: ${e.target.files[0].name}`;
        fileDisplay.style.display = 'block';
    } else {
        fileDisplay.style.display = 'none';
    }
});

// --- AUTO-GRAB LOGIC ---
document.getElementById('scanBtn').addEventListener('click', async () => {
    // Query all tabs
    let tabs = await chrome.tabs.query({});

    // Filter tabs by Moodle URL pattern
    const moodleUrls = tabs
        .map(tab => tab.url)
        .filter(url => url && (url.includes('mod/resource/view.php') || url.includes('pluginfile.php')));

    // Remove duplicates
    const uniqueUrls = [...new Set(moodleUrls)];

    if (uniqueUrls.length > 0) {
        const textarea = document.getElementById('urlInput');
        // Append URLs if textarea is not empty, otherwise set it
        const existingText = textarea.value.trim();
        if (existingText) {
            textarea.value = existingText + '\n' + uniqueUrls.join('\n');
        } else {
            textarea.value = uniqueUrls.join('\n');
        }
        updateLineNumbers(); 
        document.getElementById('status').innerText = `✅ Grabbed ${uniqueUrls.length} open tab URLs!`;
    } else {
        document.getElementById('status').innerText = "No Moodle PDF tabs found open.";
    }
});

// --- MAIN MERGER LOGIC ---
let activeAbortController = null;

document.getElementById('cancelBtn').addEventListener('click', () => {
    if (activeAbortController) activeAbortController.abort("USER_CANCELED");
});

document.getElementById('mergeBtn').addEventListener('click', async () => {
    const urlText = document.getElementById('urlInput').value;
    const rawUrls = urlText.split('\n').map(u => u.trim()).filter(u => u !== '');
    const statusEl = document.getElementById('status');
    const mergeBtn = document.getElementById('mergeBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');

    if (rawUrls.length === 0) {
        statusEl.innerText = "Please enter at least one URL.";
        return;
    }

    const urls = rawUrls.map(urlString => {
        try {
            const urlObj = new URL(urlString);
            if (!urlObj.searchParams.has('redirect')) urlObj.searchParams.append('redirect', '1');
            return urlObj.toString();
        } catch (e) { return urlString; }
    });

    mergeBtn.disabled = true;
    cancelBtn.disabled = false;
    cancelBtn.style.display = 'block'; 
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = '#2ea043'; 
    
    activeAbortController = new AbortController();
    
    try {
        const { PDFDocument } = PDFLib;
        let masterPdf;
        const existingFileInput = document.getElementById('existingPdfInput');
        
        if (existingFileInput.files.length > 0) {
            statusEl.innerText = "Loading existing PDF...";
            const file = existingFileInput.files[0];
            const arrayBuffer = await file.arrayBuffer();
            masterPdf = await PDFDocument.load(arrayBuffer);
        } else {
            masterPdf = await PDFDocument.create();
        }

        for (let i = 0; i < urls.length; i++) {
            let success = false;
            const maxRetries = 5;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                if (activeAbortController.signal.aborted) throw new Error("USER_CANCELED");

                statusEl.innerText = `Downloading document ${i + 1} of ${urls.length}\n(Attempt ${attempt + 1} of ${maxRetries})...`;
                
                try {
                    const combinedSignal = AbortSignal.any([
                        activeAbortController.signal, 
                        AbortSignal.timeout(60000)
                    ]);

                    const response = await fetch(urls[i], { signal: combinedSignal });
                    const contentType = response.headers.get('content-type') || '';

                    if (!contentType.includes('application/pdf')) throw new Error("AUTH_ERROR");

                    const arrayBuffer = await response.arrayBuffer();
                    const fetchedPdf = await PDFDocument.load(arrayBuffer);
                    const copiedPages = await masterPdf.copyPages(fetchedPdf, fetchedPdf.getPageIndices());
                    
                    copiedPages.forEach((page) => masterPdf.addPage(page));
                    
                    success = true;
                    
                    const percentComplete = ((i + 1) / urls.length) * 100;
                    progressBar.style.width = `${percentComplete}%`;
                    
                    break; 

                } catch (err) {
                    if (err.name === 'AbortError' || err.message === "USER_CANCELED" || (activeAbortController && activeAbortController.signal.aborted)) {
                        throw new Error("USER_CANCELED");
                    }

                    if (err.message === "AUTH_ERROR" || err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
                        const safeLoginUrlObj = new URL(urls[0]);
                        safeLoginUrlObj.searchParams.delete('redirect');
                        const safeLoginUrl = safeLoginUrlObj.toString();
                        
                        chrome.windows.create({ 
                            url: safeLoginUrl, type: "popup", width: 600, height: 700, focused: true
                        }, (authWindow) => {
                            const authTabId = authWindow.tabs[0].id;
                            const tabListener = (tabId, changeInfo, tab) => {
                                if (tabId === authTabId && changeInfo.status === 'complete' && tab.url) {
                                    if (tab.url.startsWith("https://moodle.huji.ac.il/") && !tab.url.includes("login")) {
                                        chrome.windows.remove(authWindow.id); 
                                        chrome.tabs.onUpdated.removeListener(tabListener); 
                                        
                                        progressContainer.style.display = 'none';
                                        statusEl.innerText = "✅ Authentication successful! You can now click Download.";
                                    }
                                }
                            };
                            chrome.tabs.onUpdated.addListener(tabListener);
                            chrome.tabs.onRemoved.addListener(function removedListener(closedTabId) {
                                if (closedTabId === authTabId) {
                                    chrome.tabs.onUpdated.removeListener(tabListener);
                                    chrome.tabs.onRemoved.removeListener(removedListener);
                                }
                            });
                        });
                        
                        throw new Error("A secure login window has been opened for you.");
                    }
                    
                    if (attempt < maxRetries - 1) {
                        const waitTime = (attempt + 1) * 5000; 
                        statusEl.innerText = `Server hiccup. Retrying document ${i + 1} in ${waitTime / 1000}s...`;
                        
                        await new Promise((resolve, reject) => {
                            const timeoutId = setTimeout(resolve, waitTime);
                            activeAbortController.signal.addEventListener('abort', () => {
                                clearTimeout(timeoutId);
                                reject(new Error("USER_CANCELED"));
                            });
                        });
                    }
                }
            } 

            if (!success) throw new Error(`Giving up on document ${i + 1} after ${maxRetries} attempts.`);

            if (i < urls.length - 1) {
                await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(resolve, 1500);
                    activeAbortController.signal.addEventListener('abort', () => {
                        clearTimeout(timeoutId);
                        reject(new Error("USER_CANCELED"));
                    });
                });
            }
        }

        statusEl.innerText = "All downloads successful! Merging and saving...";
        const pdfBytes = await masterPdf.save();
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        let desiredName = document.getElementById('filenameInput').value.trim();
        if (desiredName) {
            if (!desiredName.toLowerCase().endsWith('.pdf')) {
                desiredName += '.pdf';
            }
        } else {
            desiredName = "Merged_Moodle_Documents.pdf";
        }
        
        chrome.downloads.download({
            url: blobUrl,
            filename: desiredName
        });

        statusEl.innerText = `🎉 Success! Your complete, ${urls.length}-document PDF is ready.`;

    } catch (error) {
        progressBar.style.backgroundColor = '#da3633'; 
        
        if (error.message === "USER_CANCELED") {
            statusEl.innerText = "🛑 Download manually aborted.";
        } else if (error.message === "A secure login window has been opened for you.") {
            statusEl.innerText = error.message;
            progressContainer.style.display = 'none'; 
        } else {
            statusEl.innerText = `❌ Error: ${error.message}`;
            console.error("Extension Error:", error);
        }
    } finally {
        mergeBtn.disabled = false;
        cancelBtn.disabled = true;
        cancelBtn.style.display = 'none'; 
        activeAbortController = null;

        // --- THE DISAPPEARING ACT ---
        // Wait 1.5 seconds so the user can see the final status, then hide the bar
        setTimeout(() => {
            // Only hide it if the user hasn't already clicked Download again
            if (!activeAbortController) {
                progressContainer.style.display = 'none';
            }
        }, 1500);
    }
});