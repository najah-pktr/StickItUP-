// StickItUP! Content Script

let notes = [];
let isDarkMode = false;
let globallyHidden = false;
let urlMatchSetting = 'exact'; // 'exact' or 'domain'

// Initialize
const init = async () => {
    const data = await chrome.storage.local.get(['notes', 'darkMode', 'globallyHidden', 'urlMatchSetting']);
    notes = data.notes || [];
    isDarkMode = data.darkMode || false;
    globallyHidden = data.globallyHidden || false;
    urlMatchSetting = data.urlMatchSetting || 'exact';

    renderNotes();
    applyTheme();
};

const applyTheme = () => {
    document.body.classList.remove('siu-dark', 'siu-light');
    document.body.classList.add(isDarkMode ? 'siu-dark' : 'siu-light');
};

const shouldShowNoteOnPage = (note, currentUrl, matchSetting) => {
    try {
        if (!note.url) return false;

        // Clean URL to handle trailing slashes or hash variations smoothly
        const cleanUrl = (urlStr) => {
            const url = new URL(urlStr);
            return url.origin + url.pathname.replace(/\/$/, '') + url.search;
        };

        const currentClean = cleanUrl(currentUrl);
        const noteClean = cleanUrl(note.url);

        if (matchSetting === 'exact') {
            return currentClean === noteClean;
        } else if (matchSetting === 'domain') {
            const currentObj = new URL(currentUrl);
            const noteObj = new URL(note.url);
            return currentObj.origin === noteObj.origin;
        }

        return currentClean === noteClean;
    } catch (e) {
        return note.url === currentUrl;
    }
};

const renderNotes = () => {
    // Remove existing notes from DOM
    document.querySelectorAll('.siu-note').forEach(n => n.remove());

    if (globallyHidden) {
        return;
    }

    const currentUrl = window.location.href;

    notes.forEach(note => {
        if (shouldShowNoteOnPage(note, currentUrl, urlMatchSetting)) {
            createNoteElement(note);
        }
    });
};

const getFontClassName = (font) => {
    if (!font) return 'siu-font-outfit';
    if (font.includes('Caveat')) return 'siu-font-caveat';
    if (font.includes('Playfair')) return 'siu-font-playfair';
    if (font.includes('Fira')) return 'siu-font-fira';
    if (font.includes('Pacifico')) return 'siu-font-pacifico';
    return 'siu-font-outfit';
};

const createNoteElement = (note) => {
    const el = document.createElement('div');
    el.className = 'siu-note';
    el.id = `siu-note-${note.id}`;

    // Set custom positions and dimensions
    el.style.left = `${note.x}px`;
    el.style.top = `${note.y}px`;
    if (note.width) el.style.width = `${note.width}px`;
    if (note.height) el.style.height = `${note.height}px`;

    // Support modern solid colors or multi-stop glassy gradients
    el.style.background = note.color || 'rgba(255, 255, 255, 0.85)';

    // Add special states
    if (note.isPinned) el.classList.add('siu-pinned');
    if (note.isCollapsed) el.classList.add('siu-collapsed');

    el.innerHTML = `
        <div class="siu-note-header">
            <div class="siu-note-controls">
                <button class="siu-control-btn siu-delete" title="Delete Note">🗑️</button>
                <button class="siu-control-btn siu-color" title="Theme Palette">🎨</button>
                <button class="siu-control-btn siu-customize-toggle" title="Customize Text">✍️</button>
                <button class="siu-control-btn siu-pin-btn ${note.isPinned ? 'active' : ''}" title="${note.isPinned ? 'Unlock Note' : 'Pin Note'}">${note.isPinned ? '📌' : '📍'}</button>
                <button class="siu-control-btn siu-collapse-btn ${note.isCollapsed ? 'active' : ''}" title="${note.isCollapsed ? 'Expand Note' : 'Minimize Note'}">${note.isCollapsed ? '➕' : '➖'}</button>
            </div>
            <div class="siu-drag-handle"></div>
        </div>
        <textarea class="siu-note-body" placeholder="Write your thoughts...">${note.content || ''}</textarea>
        
        <div class="siu-color-picker" style="display: none;">
            <div class="siu-color-dot" style="background: rgba(255, 107, 107, 0.85);" data-color="rgba(255, 107, 107, 0.85)" title="Rose"></div>
            <div class="siu-color-dot" style="background: rgba(255, 217, 61, 0.85);" data-color="rgba(255, 217, 61, 0.85)" title="Amber"></div>
            <div class="siu-color-dot" style="background: rgba(107, 255, 184, 0.85);" data-color="rgba(107, 255, 184, 0.85)" title="Mint"></div>
            <div class="siu-color-dot" style="background: rgba(107, 196, 255, 0.85);" data-color="rgba(107, 196, 255, 0.85)" title="Sky"></div>
            <div class="siu-color-dot" style="background: rgba(214, 107, 255, 0.85);" data-color="rgba(214, 107, 255, 0.85)" title="Lavender"></div>
            <div class="siu-color-dot" style="background: rgba(255, 255, 255, 0.85);" data-color="rgba(255, 255, 255, 0.85)" title="Frosted Light"></div>
            <div class="siu-color-dot" style="background: rgba(30, 30, 30, 0.85);" data-color="rgba(30, 30, 30, 0.85)" title="Frosted Dark"></div>
            <!-- Beautiful Gradients -->
            <div class="siu-color-dot" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);" data-color="linear-gradient(135deg, rgba(255, 154, 158, 0.95) 0%, rgba(254, 207, 239, 0.95) 100%)" title="Sunset Pink"></div>
            <div class="siu-color-dot" style="background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);" data-color="linear-gradient(135deg, rgba(161, 196, 253, 0.95) 0%, rgba(194, 233, 251, 0.95) 100%)" title="Ice Blue"></div>
            <div class="siu-color-dot" style="background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);" data-color="linear-gradient(135deg, rgba(246, 211, 101, 0.95) 0%, rgba(253, 160, 133, 0.95) 100%)" title="Warm Peach"></div>
            <div class="siu-color-dot" style="background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);" data-color="linear-gradient(135deg, rgba(212, 252, 121, 0.95) 0%, rgba(150, 230, 161, 0.95) 100%)" title="Green Apple"></div>
            <div class="siu-color-dot" style="background: linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%);" data-color="linear-gradient(135deg, rgba(207, 217, 223, 0.95) 0%, rgba(226, 235, 240, 0.95) 100%)" title="Silver Glass"></div>
        </div>
        
        <div class="siu-customize-panel" style="display: none;">
            <div class="siu-panel-section">
                <label>Font Family</label>
                <select class="siu-font-select">
                    <option value="'Outfit', sans-serif" ${note.fontFamily === "'Outfit', sans-serif" ? 'selected' : ''}>Modern Outfit</option>
                    <option value="'Caveat', cursive" ${note.fontFamily === "'Caveat', cursive" ? 'selected' : ''}>Warm Cursive</option>
                    <option value="'Playfair Display', serif" ${note.fontFamily === "'Playfair Display', serif" ? 'selected' : ''}>Classic Serif</option>
                    <option value="'Fira Code', monospace" ${note.fontFamily === "'Fira Code', monospace" ? 'selected' : ''}>Dev Monospace</option>
                    <option value="'Pacifico', cursive" ${note.fontFamily === "'Pacifico', cursive" ? 'selected' : ''}>Retro Script</option>
                </select>
            </div>
            
            <div class="siu-panel-row">
                <div class="siu-panel-section">
                    <label>Size</label>
                    <div class="siu-size-controls">
                        <button class="siu-size-btn siu-size-dec">−</button>
                        <span class="siu-size-val">${note.fontSize || 15}px</span>
                        <button class="siu-size-btn siu-size-inc">+</button>
                    </div>
                </div>
                
                <div class="siu-panel-section">
                    <label>Style</label>
                    <div class="siu-style-controls">
                        <button class="siu-style-btn siu-btn-bold ${note.isBold ? 'active' : ''}">B</button>
                        <button class="siu-style-btn siu-btn-italic ${note.isItalic ? 'active' : ''}">I</button>
                        <button class="siu-style-btn siu-btn-underline ${note.isUnderline ? 'active' : ''}">U</button>
                    </div>
                </div>
            </div>
            
            <div class="siu-panel-section">
                <label>Alignment</label>
                <div class="siu-align-controls">
                    <button class="siu-align-btn siu-btn-left ${(!note.alignment || note.alignment === 'left') ? 'active' : ''}">Left</button>
                    <button class="siu-align-btn siu-btn-center ${note.alignment === 'center' ? 'active' : ''}">Center</button>
                    <button class="siu-align-btn siu-btn-right ${note.alignment === 'right' ? 'active' : ''}">Right</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(el);

    // Apply text styling to the textarea element
    const textarea = el.querySelector('.siu-note-body');
    textarea.className = `siu-note-body ${getFontClassName(note.fontFamily)}`;
    textarea.style.fontSize = `${note.fontSize || 15}px`;
    textarea.style.textAlign = note.alignment || 'left';
    textarea.style.fontWeight = note.isBold ? 'bold' : 'normal';
    textarea.style.fontStyle = note.isItalic ? 'italic' : 'normal';
    textarea.style.textDecoration = note.isUnderline ? 'underline' : 'none';

    // Dragging setup
    makeDraggable(el, note.id);

    // Save resized dimensions when resizing is complete
    el.addEventListener('mouseup', () => {
        if (note.isPinned || note.isCollapsed) return;
        const newWidth = el.offsetWidth;
        const newHeight = el.offsetHeight;
        if (newWidth !== note.width || newHeight !== note.height) {
            updateNote(note.id, { width: newWidth, height: newHeight });
        }
    });

    // Content input sync
    textarea.addEventListener('input', (e) => {
        updateNote(note.id, { content: e.target.value });
    });

    // Delete
    el.querySelector('.siu-delete').addEventListener('click', () => {
        deleteNote(note.id);
        el.remove();
    });

    // Color Picker UI Toggles
    const colorPicker = el.querySelector('.siu-color-picker');
    const customizePanel = el.querySelector('.siu-customize-panel');

    el.querySelector('.siu-color').addEventListener('click', () => {
        customizePanel.style.display = 'none';
        colorPicker.style.display = colorPicker.style.display === 'none' ? 'flex' : 'none';
    });

    // Color Preset selection
    el.querySelectorAll('.siu-color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const color = dot.getAttribute('data-color');
            el.style.background = color;
            updateNote(note.id, { color });
            colorPicker.style.display = 'none';
        });
    });

    // Customizer Panel toggle
    el.querySelector('.siu-customize-toggle').addEventListener('click', () => {
        colorPicker.style.display = 'none';
        customizePanel.style.display = customizePanel.style.display === 'none' ? 'flex' : 'none';
    });

    // Font select handler
    const fontSelect = el.querySelector('.siu-font-select');
    fontSelect.addEventListener('change', (e) => {
        const fontFamily = e.target.value;
        textarea.className = `siu-note-body ${getFontClassName(fontFamily)}`;
        updateNote(note.id, { fontFamily });
    });

    // Font size controls
    const sizeVal = el.querySelector('.siu-size-val');
    el.querySelector('.siu-size-dec').addEventListener('click', () => {
        let currentSize = note.fontSize || 15;
        if (currentSize > 10) {
            currentSize -= 1;
            textarea.style.fontSize = `${currentSize}px`;
            sizeVal.textContent = `${currentSize}px`;
            updateNote(note.id, { fontSize: currentSize });
        }
    });

    el.querySelector('.siu-size-inc').addEventListener('click', () => {
        let currentSize = note.fontSize || 15;
        if (currentSize < 36) {
            currentSize += 1;
            textarea.style.fontSize = `${currentSize}px`;
            sizeVal.textContent = `${currentSize}px`;
            updateNote(note.id, { fontSize: currentSize });
        }
    });

    // Style buttons handlers
    const boldBtn = el.querySelector('.siu-btn-bold');
    boldBtn.addEventListener('click', () => {
        const active = !boldBtn.classList.contains('active');
        boldBtn.classList.toggle('active');
        textarea.style.fontWeight = active ? 'bold' : 'normal';
        updateNote(note.id, { isBold: active });
    });

    const italicBtn = el.querySelector('.siu-btn-italic');
    italicBtn.addEventListener('click', () => {
        const active = !italicBtn.classList.contains('active');
        italicBtn.classList.toggle('active');
        textarea.style.fontStyle = active ? 'italic' : 'normal';
        updateNote(note.id, { isItalic: active });
    });

    const underlineBtn = el.querySelector('.siu-btn-underline');
    underlineBtn.addEventListener('click', () => {
        const active = !underlineBtn.classList.contains('active');
        underlineBtn.classList.toggle('active');
        textarea.style.textDecoration = active ? 'underline' : 'none';
        updateNote(note.id, { isUnderline: active });
    });

    // Alignment buttons handlers
    const alignLeft = el.querySelector('.siu-btn-left');
    const alignCenter = el.querySelector('.siu-btn-center');
    const alignRight = el.querySelector('.siu-btn-right');

    const setAlignment = (align) => {
        textarea.style.textAlign = align;
        alignLeft.classList.toggle('active', align === 'left');
        alignCenter.classList.toggle('active', align === 'center');
        alignRight.classList.toggle('active', align === 'right');
        updateNote(note.id, { alignment: align });
    };

    alignLeft.addEventListener('click', () => setAlignment('left'));
    alignCenter.addEventListener('click', () => setAlignment('center'));
    alignRight.addEventListener('click', () => setAlignment('right'));

    // Pin handler
    const pinBtn = el.querySelector('.siu-pin-btn');
    pinBtn.addEventListener('click', () => {
        const active = !el.classList.contains('siu-pinned');
        el.classList.toggle('siu-pinned', active);
        pinBtn.classList.toggle('active', active);
        pinBtn.textContent = active ? '📌' : '📍';
        pinBtn.setAttribute('title', active ? 'Unlock Note' : 'Pin Note');
        updateNote(note.id, { isPinned: active });
    });

    // Collapse handler
    const collapseBtn = el.querySelector('.siu-collapse-btn');
    collapseBtn.addEventListener('click', () => {
        const active = !el.classList.contains('siu-collapsed');
        el.classList.toggle('siu-collapsed', active);
        collapseBtn.classList.toggle('active', active);
        collapseBtn.textContent = active ? '➕' : '➖';
        collapseBtn.setAttribute('title', active ? 'Expand Note' : 'Minimize Note');
        updateNote(note.id, { isCollapsed: active });
    });
};

const makeDraggable = (el, id) => {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const handle = el.querySelector('.siu-drag-handle');

    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (el.classList.contains('siu-pinned') || el.classList.contains('siu-collapsed')) return;

        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        const newTop = el.offsetTop - pos2;
        const newLeft = el.offsetLeft - pos1;

        // Prevent notes from dragging completely out of viewports
        const maxTop = window.innerHeight - 50;
        const maxLeft = window.innerWidth - 50;

        el.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
        el.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        updateNote(id, { x: el.offsetLeft, y: el.offsetTop });
    }
};

const updateNote = async (id, changes) => {
    notes = notes.map(n => n.id === id ? { ...n, ...changes } : n);
    await chrome.storage.local.set({ notes });
};

const deleteNote = async (id) => {
    notes = notes.filter(n => n.id !== id);
    await chrome.storage.local.set({ notes });
};

const addNewNote = async () => {
    // If notes are globally hidden, reveal them automatically for immediate visual feedback
    if (globallyHidden) {
        globallyHidden = false;
        await chrome.storage.local.set({ globallyHidden: false });
    }

    // Load user's default customization presets if they exist, or use beautiful standard defaults
    const defaults = await chrome.storage.local.get(['defaultColor', 'defaultFontFamily']);

    const newNote = {
        id: Date.now(),
        content: '',
        x: 120 + (Math.random() * 60), // offset randomly slightly so multiple notes don't stack perfectly
        y: 120 + (Math.random() * 60),
        width: 280,
        height: 180,
        color: defaults.defaultColor || 'linear-gradient(135deg, rgba(255, 154, 158, 0.95) 0%, rgba(254, 207, 239, 0.95) 100%)', // Default sunset gradient
        fontFamily: defaults.defaultFontFamily || "'Outfit', sans-serif",
        fontSize: 15,
        isPinned: false,
        isCollapsed: false,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        alignment: 'left',
        url: window.location.href,
        timestamp: Date.now()
    };

    notes.push(newNote);
    await chrome.storage.local.set({ notes });
    createNoteElement(newNote);
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'addNote') {
        addNewNote();
    }
});

// Listen for storage changes (to sync across tabs seamlessly)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.darkMode) {
            isDarkMode = changes.darkMode.newValue;
            applyTheme();
        }

        let shouldFullReRender = false;

        if (changes.globallyHidden) {
            globallyHidden = changes.globallyHidden.newValue;
            shouldFullReRender = true;
        }

        if (changes.urlMatchSetting) {
            urlMatchSetting = changes.urlMatchSetting.newValue;
            shouldFullReRender = true;
        }

        if (changes.notes) {
            const newNotes = changes.notes.newValue || [];

            // If notes were added or removed, do a full re-render
            if (newNotes.length !== notes.length) {
                notes = newNotes;
                shouldFullReRender = true;
            } else {
                // Otherwise, update existing notes in-place to avoid destroying DOM focus!
                notes = newNotes;
                notes.forEach(note => {
                    const el = document.getElementById(`siu-note-${note.id}`);
                    if (el) {
                        const textarea = el.querySelector('.siu-note-body');

                        // 1. Content: Only update if the user isn't currently typing in this exact field
                        if (textarea && document.activeElement !== textarea) {
                            textarea.value = note.content || '';
                        }

                        // 2. Position & Dimensions: Only update if not active to prevent style overriding during drag/type
                        if (document.activeElement !== textarea) {
                            el.style.left = `${note.x}px`;
                            el.style.top = `${note.y}px`;
                            if (note.width) el.style.width = `${note.width}px`;
                            if (note.height) el.style.height = `${note.height}px`;
                        }

                        // 3. Color Background/Gradient
                        el.style.background = note.color || 'rgba(255, 255, 255, 0.85)';

                        // 4. Pinned Status
                        el.classList.toggle('siu-pinned', !!note.isPinned);
                        const pinBtn = el.querySelector('.siu-pin-btn');
                        if (pinBtn) {
                            pinBtn.classList.toggle('active', !!note.isPinned);
                            pinBtn.textContent = note.isPinned ? '📌' : '📍';
                            pinBtn.setAttribute('title', note.isPinned ? 'Unlock Note' : 'Pin Note');
                        }

                        // 5. Collapsed Status
                        el.classList.toggle('siu-collapsed', !!note.isCollapsed);
                        const collapseBtn = el.querySelector('.siu-collapse-btn');
                        if (collapseBtn) {
                            collapseBtn.classList.toggle('active', !!note.isCollapsed);
                            collapseBtn.textContent = note.isCollapsed ? '➕' : '➖';
                            collapseBtn.setAttribute('title', note.isCollapsed ? 'Expand Note' : 'Minimize Note');
                        }

                        // 6. Typographical Styling
                        if (textarea) {
                            textarea.className = `siu-note-body ${getFontClassName(note.fontFamily)}`;
                            textarea.style.fontSize = `${note.fontSize || 15}px`;
                            textarea.style.textAlign = note.alignment || 'left';
                            textarea.style.fontWeight = note.isBold ? 'bold' : 'normal';
                            textarea.style.fontStyle = note.isItalic ? 'italic' : 'normal';
                            textarea.style.textDecoration = note.isUnderline ? 'underline' : 'none';
                        }
                    }
                });
            }
        }

        if (shouldFullReRender) {
            renderNotes();
        }
    }
});

init();
