// StickItUP! Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const addNoteBtn = document.getElementById('addNote');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const globallyHiddenToggle = document.getElementById('globallyHiddenToggle');
    
    const totalNotesCount = document.getElementById('totalNotesCount');
    const pageNotesCount = document.getElementById('pageNotesCount');
    
    const defaultFontFamily = document.getElementById('defaultFontFamily');
    const defaultColorTheme = document.getElementById('defaultColorTheme');
    const urlMatchSettingSelect = document.getElementById('urlMatchSetting');
    
    const searchNotesInput = document.getElementById('searchNotesInput');
    const notesListContainer = document.getElementById('notesListContainer');
    
    const btnExport = document.getElementById('btnExport');
    const btnImport = document.getElementById('btnImport');
    const importFileInput = document.getElementById('importFileInput');
    const btnClearAll = document.getElementById('btnClearAll');
    const messageEl = document.getElementById('message');

    let allNotes = [];
    let currentTabUrl = '';
    let currentTabId = null;

    // Toast Notification helper
    const showMessage = (msg, isError = false) => {
        messageEl.textContent = msg;
        messageEl.style.display = 'block';
        messageEl.style.background = isError ? 'rgba(255, 59, 48, 0.95)' : 'rgba(52, 199, 89, 0.95)';
        messageEl.style.color = '#ffffff';
        setTimeout(() => { messageEl.style.display = 'none'; }, 3500);
    };

    // Tab Navigation Logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const viewPanels = document.querySelectorAll('.view-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            viewPanels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            if (targetTab === 'tab-directory') {
                renderNotesDirectory();
            }
        });
    });

    // Clean URL for lenient comparison
    const cleanUrl = (urlStr) => {
        try {
            const url = new URL(urlStr);
            return url.origin + url.pathname.replace(/\/$/, '') + url.search;
        } catch(e) {
            return urlStr;
        }
    };

    // Check if a note should display on a page URL
    const shouldShowNoteOnPage = (note, pageUrl, matchSetting) => {
        if (!note.url || !pageUrl) return false;
        try {
            const currentClean = cleanUrl(pageUrl);
            const noteClean = cleanUrl(note.url);

            if (matchSetting === 'domain') {
                return new URL(pageUrl).origin === new URL(note.url).origin;
            }
            return currentClean === noteClean;
        } catch(e) {
            return note.url === pageUrl;
        }
    };

    // Load Initial State
    const init = async () => {
        // Get storage values
        const data = await chrome.storage.local.get([
            'notes', 'darkMode', 'globallyHidden', 'urlMatchSetting', 
            'defaultColor', 'defaultFontFamily'
        ]);

        allNotes = data.notes || [];
        
        // Dark Mode Toggle init
        if (data.darkMode) {
            darkModeToggle.checked = true;
            document.body.classList.add('dark-mode');
        }

        // Visibility Toggle init (checked means VISIBLE, globallyHidden is FALSE)
        globallyHiddenToggle.checked = !data.globallyHidden;

        // Customization presets init
        if (data.urlMatchSetting) {
            urlMatchSettingSelect.value = data.urlMatchSetting;
        }
        if (data.defaultFontFamily) {
            defaultFontFamily.value = data.defaultFontFamily;
        }
        if (data.defaultColor) {
            defaultColorTheme.value = data.defaultColor;
        }

        // Get Active Tab Info
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                currentTabUrl = tab.url;
                currentTabId = tab.id;
            }
        } catch (err) {
            console.error("Error querying active tab:", err);
        }

        updateStats();
    };

    // Update Counts & Statistics on Home Tab
    const updateStats = () => {
        totalNotesCount.textContent = allNotes.length;
        
        const matchSetting = urlMatchSettingSelect.value || 'exact';
        const matchingNotes = allNotes.filter(n => shouldShowNoteOnPage(n, currentTabUrl, matchSetting));
        pageNotesCount.textContent = matchingNotes.length;
    };

    // Render Note Directory (Tab 2)
    const renderNotesDirectory = () => {
        const query = searchNotesInput.value.toLowerCase().trim();
        notesListContainer.innerHTML = '';

        const filteredNotes = allNotes.filter(note => {
            const contentMatches = note.content && note.content.toLowerCase().includes(query);
            let domainMatches = false;
            try {
                const domain = new URL(note.url).hostname;
                domainMatches = domain.toLowerCase().includes(query);
            } catch (e) {}
            
            return contentMatches || domainMatches || query === '';
        });

        if (filteredNotes.length === 0) {
            notesListContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">No matching sticky notes found</div>
                </div>
            `;
            return;
        }

        // Sort by timestamp newest first
        filteredNotes.sort((a, b) => b.timestamp - a.timestamp);

        filteredNotes.forEach(note => {
            let hostname = 'Unknown Page';
            let domain = '';
            try {
                const urlObj = new URL(note.url);
                hostname = urlObj.hostname;
                domain = urlObj.hostname;
            } catch (e) {}

            const card = document.createElement('div');
            card.className = 'note-card';
            card.id = `directory-note-${note.id}`;

            // Embedded design line representing the color of the sticky note
            const colorLine = document.createElement('div');
            colorLine.className = 'note-card-border';
            colorLine.style.background = note.color || 'rgba(255,255,255,0.85)';
            card.appendChild(colorLine);

            const header = document.createElement('div');
            header.className = 'note-card-header';

            const siteGroup = document.createElement('div');
            siteGroup.className = 'note-card-site';
            
            // Render favicon
            const favicon = document.createElement('img');
            favicon.className = 'site-favicon';
            favicon.src = domain ? `https://www.google.com/s2/favicons?sz=64&domain=${domain}` : 'assets/icon16.png';
            favicon.onerror = () => { favicon.src = 'assets/icon16.png'; };
            
            const domainSpan = document.createElement('span');
            domainSpan.textContent = hostname;
            domainSpan.title = note.url;

            siteGroup.appendChild(favicon);
            siteGroup.appendChild(domainSpan);

            const actions = document.createElement('div');
            actions.className = 'note-card-actions';

            // Teleport / Focus tab action
            const teleportBtn = document.createElement('button');
            teleportBtn.className = 'action-btn';
            teleportBtn.textContent = '🚀';
            teleportBtn.title = 'Teleport to note website';
            teleportBtn.addEventListener('click', async () => {
                if (note.url) {
                    await chrome.tabs.create({ url: note.url });
                }
            });

            // Delete action
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn btn-delete-card';
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = 'Delete note';
            deleteBtn.addEventListener('click', async () => {
                if (confirm("Delete this sticky note?")) {
                    allNotes = allNotes.filter(n => n.id !== note.id);
                    await chrome.storage.local.set({ notes: allNotes });
                    card.remove();
                    updateStats();
                    renderNotesDirectory();
                }
            });

            actions.appendChild(teleportBtn);
            actions.appendChild(deleteBtn);

            header.appendChild(siteGroup);
            header.appendChild(actions);

            const preview = document.createElement('div');
            if (note.content && note.content.trim()) {
                preview.className = 'note-card-preview';
                preview.textContent = note.content;
            } else {
                preview.className = 'note-card-preview empty-preview';
                preview.textContent = 'Empty sticky note...';
            }

            card.appendChild(header);
            card.appendChild(preview);

            notesListContainer.appendChild(card);
        });
    };

    // Add Note Click Handler
    addNoteBtn.addEventListener('click', async () => {
        try {
            if (currentTabUrl && !currentTabUrl.startsWith('chrome://') && !currentTabUrl.startsWith('about:') && !currentTabUrl.startsWith('edge://')) {
                // If notes were globally hidden, automatically reveal them!
                if (!globallyHiddenToggle.checked) {
                    globallyHiddenToggle.checked = true;
                    await chrome.storage.local.set({ globallyHidden: false });
                }

                await chrome.tabs.sendMessage(currentTabId, { action: 'addNote' });
                
                // Fetch newly added note for popup stats immediately
                setTimeout(async () => {
                    const data = await chrome.storage.local.get(['notes']);
                    allNotes = data.notes || [];
                    updateStats();
                    showMessage("Sticky Note Added! ✨");
                }, 100);
            } else {
                showMessage("Notes cannot be added to system pages.", true);
            }
        } catch (err) {
            console.error("Add note message error:", err);
            showMessage("Please refresh the page to place notes.", true);
        }
    });

    // Globally Hidden visibility switcher (Checked -> visible -> globallyHidden = false)
    globallyHiddenToggle.addEventListener('change', async (e) => {
        const visible = e.target.checked;
        await chrome.storage.local.set({ globallyHidden: !visible });
        showMessage(visible ? "All notes revealed" : "All notes hidden");
    });

    // Dark Mode Toggle
    darkModeToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        await chrome.storage.local.set({ darkMode: enabled });
    });

    // Search bar input syncing
    searchNotesInput.addEventListener('input', () => {
        renderNotesDirectory();
    });

    // Select settings listeners
    defaultFontFamily.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ defaultFontFamily: e.target.value });
        showMessage("Default font preset updated!");
    });

    defaultColorTheme.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ defaultColor: e.target.value });
        showMessage("Default theme preset updated!");
    });

    urlMatchSettingSelect.addEventListener('change', async (e) => {
        await chrome.storage.local.set({ urlMatchSetting: e.target.value });
        updateStats();
        showMessage("URL filter setting saved!");
    });

    // Export Notes logic (JSON file download)
    btnExport.addEventListener('click', () => {
        if (allNotes.length === 0) {
            showMessage("No notes available to export.", true);
            return;
        }
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allNotes, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", "stickitup_backup.json");
            dlAnchorElem.click();
            showMessage("Backup JSON downloaded!");
        } catch (e) {
            showMessage("Failed to export notes.", true);
        }
    });

    // Import Notes logic
    btnImport.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (Array.isArray(importedData)) {
                    // Combine notes by ID avoiding duplicates
                    const existingIds = new Set(allNotes.map(n => n.id));
                    const newNotesCount = importedData.filter(n => !existingIds.has(n.id)).length;
                    
                    // Simple merge
                    const mergedNotes = [...allNotes];
                    importedData.forEach(importedNote => {
                        // Validate basic shape
                        if (importedNote.id && importedNote.url) {
                            const index = mergedNotes.findIndex(n => n.id === importedNote.id);
                            if (index !== -1) {
                                mergedNotes[index] = importedNote; // overwrite existing
                            } else {
                                mergedNotes.push(importedNote); // add new
                            }
                        }
                    });

                    allNotes = mergedNotes;
                    await chrome.storage.local.set({ notes: allNotes });
                    updateStats();
                    showMessage(`Successfully imported ${newNotesCount} new notes!`);
                    
                    // Refresh notes if directory is active
                    if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'tab-directory') {
                        renderNotesDirectory();
                    }
                } else {
                    showMessage("Invalid backup format.", true);
                }
            } catch (err) {
                showMessage("Failed to parse JSON file.", true);
            }
            importFileInput.value = ''; // clear input
        };
        reader.readAsText(file);
    });

    // Factory Reset / Clear All Notes logic
    btnClearAll.addEventListener('click', async () => {
        if (confirm("⚠️ WARNING: This will permanently delete ALL sticky notes across ALL websites. This action cannot be undone.\n\nAre you absolutely sure?")) {
            if (confirm("Double Confirmation: Delete all notes?")) {
                allNotes = [];
                await chrome.storage.local.set({ notes: [] });
                updateStats();
                showMessage("Factory reset completed. All notes deleted!");
                if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'tab-directory') {
                    renderNotesDirectory();
                }
            }
        }
    });

    // Listen to storage changes to sync statistics in real-time
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.notes) {
                allNotes = changes.notes.newValue || [];
                updateStats();
                if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'tab-directory') {
                    renderNotesDirectory();
                }
            }
        }
    });

    await init();
});
