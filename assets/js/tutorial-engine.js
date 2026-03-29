/**
 * Aqua Pulse Interactive Tutorial Engine v1.0
 * 3-Layer Architecture: Data Model → Context Provider → Visual Overlay
 * Vanilla JS — no dependencies except common.js
 */
(function() {
  'use strict';

  // ─── LAYER 1: DATA MODEL ───────────────────────────────────────────
  // Tutorial step definition schema:
  // { id, title, description, selector, action, position, inputHint, skipIf, onEnter, onExit, autoAdvance }

  var tutorials = {};  // page → steps[]
  var STORAGE_KEY = 'wi_tutorial_progress';

  // ─── LAYER 2: CONTEXT PROVIDER ─────────────────────────────────────
  var state = {
    active: false,
    page: null,
    stepIndex: 0,
    steps: [],
    completed: loadProgress()
  };

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.completed)); }
    catch(e) { /* silent */ }
  }

  function markStepDone(page, stepId) {
    if (!state.completed[page]) state.completed[page] = [];
    if (state.completed[page].indexOf(stepId) === -1) {
      state.completed[page].push(stepId);
    }
    saveProgress();
  }

  function isPageComplete(page) {
    var t = tutorials[page];
    if (!t) return false;
    var done = state.completed[page] || [];
    return t.length > 0 && done.length >= t.length;
  }

  function getPageProgress(page) {
    var t = tutorials[page];
    if (!t || t.length === 0) return 0;
    var done = (state.completed[page] || []).length;
    return Math.round((done / t.length) * 100);
  }

  // ─── LAYER 3: VISUAL OVERLAY ───────────────────────────────────────

  var overlay = null;
  var tooltip = null;
  var blocker = null;
  var progressBar = null;
  var spotlightPadding = 8;

  function createOverlay() {
    if (overlay) return;

    // SVG overlay with mask cutout
    overlay = document.createElement('div');
    overlay.id = 'wi-tutorial-overlay';
    overlay.innerHTML =
      '<svg id="wi-tut-svg" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99998;pointer-events:none">' +
        '<defs>' +
          '<mask id="wi-tut-mask">' +
            '<rect width="100%" height="100%" fill="white"/>' +
            '<rect id="wi-tut-cutout" x="0" y="0" width="0" height="0" rx="6" fill="black"/>' +
          '</mask>' +
        '</defs>' +
        '<rect width="100%" height="100%" fill="rgba(6,13,26,0.82)" mask="url(#wi-tut-mask)"/>' +
      '</svg>';
    document.body.appendChild(overlay);

    // Click blocker (blocks clicks outside spotlight)
    blocker = document.createElement('div');
    blocker.id = 'wi-tut-blocker';
    blocker.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99997;cursor:not-allowed';
    blocker.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      pulseTooltip();
    });
    document.body.appendChild(blocker);

    // Tooltip
    tooltip = document.createElement('div');
    tooltip.id = 'wi-tut-tooltip';
    tooltip.className = 'wi-tut-tooltip';
    tooltip.innerHTML =
      '<div class="wi-tut-progress-bar"><div class="wi-tut-progress-fill" id="wi-tut-progress"></div></div>' +
      '<div class="wi-tut-step-counter" id="wi-tut-counter"></div>' +
      '<h4 class="wi-tut-title" id="wi-tut-title"></h4>' +
      '<p class="wi-tut-desc" id="wi-tut-desc"></p>' +
      '<div class="wi-tut-input-hint" id="wi-tut-hint" style="display:none"></div>' +
      '<div class="wi-tut-actions">' +
        '<button class="wi-tut-btn wi-tut-btn-skip" id="wi-tut-skip">Skip</button>' +
        '<button class="wi-tut-btn wi-tut-btn-back" id="wi-tut-back" style="display:none">Back</button>' +
        '<button class="wi-tut-btn wi-tut-btn-next" id="wi-tut-next">Next</button>' +
      '</div>';
    document.body.appendChild(tooltip);

    // Wire buttons
    document.getElementById('wi-tut-next').addEventListener('click', nextStep);
    document.getElementById('wi-tut-back').addEventListener('click', prevStep);
    document.getElementById('wi-tut-skip').addEventListener('click', endTutorial);

    // Keyboard nav
    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (!state.active) return;
    if (e.key === 'Escape') endTutorial();
    else if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
    else if (e.key === 'ArrowLeft') prevStep();
  }

  function destroyOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
    if (blocker) { blocker.remove(); blocker = null; }
    if (tooltip) { tooltip.remove(); tooltip = null; }
    document.removeEventListener('keydown', handleKeydown);
    removeSpotlightHighlight();
  }

  function pulseTooltip() {
    if (!tooltip) return;
    tooltip.classList.add('wi-tut-pulse');
    setTimeout(function() { tooltip.classList.remove('wi-tut-pulse'); }, 400);
  }

  // ─── SPOTLIGHT POSITIONING ─────────────────────────────────────────

  function spotlightElement(selector) {
    removeSpotlightHighlight();
    if (!selector) {
      // No element — center spotlight as general info
      var cutout = document.getElementById('wi-tut-cutout');
      if (cutout) {
        cutout.setAttribute('x', '0');
        cutout.setAttribute('y', '0');
        cutout.setAttribute('width', '0');
        cutout.setAttribute('height', '0');
      }
      return null;
    }

    var el = document.querySelector(selector);
    if (!el) return null;

    var rect = el.getBoundingClientRect();
    var cutout = document.getElementById('wi-tut-cutout');
    if (cutout) {
      cutout.setAttribute('x', rect.left - spotlightPadding);
      cutout.setAttribute('y', rect.top - spotlightPadding);
      cutout.setAttribute('width', rect.width + spotlightPadding * 2);
      cutout.setAttribute('height', rect.height + spotlightPadding * 2);
    }

    // Add highlight ring
    el.classList.add('wi-tut-highlighted');

    // Allow clicks on spotlighted element
    el.style.position = el.style.position || 'relative';
    el.style.zIndex = '99999';
    el.style.pointerEvents = 'auto';

    // Scroll into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return el;
  }

  function removeSpotlightHighlight() {
    var prev = document.querySelector('.wi-tut-highlighted');
    if (prev) {
      prev.classList.remove('wi-tut-highlighted');
      prev.style.zIndex = '';
      prev.style.pointerEvents = '';
    }
  }

  // ─── TOOLTIP POSITIONING ───────────────────────────────────────────

  function positionTooltip(selector, preferredPos) {
    if (!tooltip) return;

    var pos = preferredPos || 'bottom';
    var padding = 16;

    if (!selector) {
      // Center of screen
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      tooltip.removeAttribute('data-pos');
      return;
    }

    var el = document.querySelector(selector);
    if (!el) {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    var rect = el.getBoundingClientRect();
    var tw = tooltip.offsetWidth || 340;
    var th = tooltip.offsetHeight || 200;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    tooltip.style.transform = '';
    tooltip.setAttribute('data-pos', pos);

    var top, left;

    switch (pos) {
      case 'top':
        top = rect.top - th - padding - spotlightPadding;
        left = rect.left + rect.width / 2 - tw / 2;
        break;
      case 'bottom':
        top = rect.bottom + padding + spotlightPadding;
        left = rect.left + rect.width / 2 - tw / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.left - tw - padding - spotlightPadding;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.right + padding + spotlightPadding;
        break;
      default:
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tw / 2;
    }

    // Keep tooltip on screen
    if (left < padding) left = padding;
    if (left + tw > vw - padding) left = vw - tw - padding;
    if (top < padding) top = padding;
    if (top + th > vh - padding) top = vh - th - padding;

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
  }

  // ─── STEP RENDERING ────────────────────────────────────────────────

  function renderStep() {
    if (!state.active || !state.steps.length) return;

    var step = state.steps[state.stepIndex];
    if (!step) { endTutorial(); return; }

    // Skip if condition met
    if (step.skipIf && step.skipIf()) {
      nextStep();
      return;
    }

    // Update UI
    var total = state.steps.length;
    var current = state.stepIndex + 1;
    document.getElementById('wi-tut-counter').textContent = 'Step ' + current + ' of ' + total;
    document.getElementById('wi-tut-title').textContent = step.title || '';
    document.getElementById('wi-tut-desc').innerHTML = step.description || '';

    // Progress bar
    var pct = Math.round((state.stepIndex / total) * 100);
    document.getElementById('wi-tut-progress').style.width = pct + '%';

    // Input hint
    var hintEl = document.getElementById('wi-tut-hint');
    if (step.inputHint) {
      hintEl.innerHTML = step.inputHint;
      hintEl.style.display = 'block';
    } else {
      hintEl.style.display = 'none';
    }

    // Back button
    document.getElementById('wi-tut-back').style.display = state.stepIndex > 0 ? 'inline-block' : 'none';

    // Next button text
    var nextBtn = document.getElementById('wi-tut-next');
    if (state.stepIndex >= total - 1) {
      nextBtn.textContent = 'Finish';
    } else if (step.action === 'interact') {
      nextBtn.textContent = 'Skip';
    } else {
      nextBtn.textContent = 'Next';
    }

    // Spotlight the element
    var el = spotlightElement(step.selector);

    // Position tooltip
    positionTooltip(step.selector, step.position);

    // Tooltip entrance animation
    tooltip.classList.remove('wi-tut-enter');
    void tooltip.offsetWidth;
    tooltip.classList.add('wi-tut-enter');

    // On enter callback
    if (step.onEnter) step.onEnter(el);

    // Auto-advance: watch for interaction
    if (step.autoAdvance && el) {
      setupAutoAdvance(el, step);
    }
  }

  function setupAutoAdvance(el, step) {
    var action = step.autoAdvance;
    var handler = function() {
      el.removeEventListener(action, handler);
      setTimeout(function() { nextStep(); }, 300);
    };
    el.addEventListener(action, handler);
  }

  // ─── NAVIGATION ────────────────────────────────────────────────────

  function nextStep() {
    if (!state.active) return;

    var step = state.steps[state.stepIndex];
    if (step) {
      if (step.onExit) step.onExit();
      markStepDone(state.page, step.id);
    }

    state.stepIndex++;
    if (state.stepIndex >= state.steps.length) {
      completeTutorial();
    } else {
      renderStep();
    }
  }

  function prevStep() {
    if (!state.active || state.stepIndex <= 0) return;
    state.stepIndex--;
    renderStep();
  }

  function endTutorial() {
    state.active = false;
    destroyOverlay();
    // Save partial progress
    saveProgress();
  }

  function completeTutorial() {
    state.active = false;
    state.completed[state.page] = state.steps.map(function(s) { return s.id; });
    saveProgress();
    destroyOverlay();
    showCompletionToast();
  }

  function showCompletionToast() {
    if (typeof bgat !== 'undefined' && bgat.common && bgat.common.showToast) {
      bgat.common.showToast('Tutorial complete! You now know all features on this page.', 'success');
    }
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────

  /**
   * Register tutorial steps for a page
   * @param {string} page - Page identifier (matches c.initPage page param)
   * @param {Array} steps - Array of step objects
   */
  function register(page, steps) {
    tutorials[page] = steps;
  }

  /**
   * Start a tutorial for the current page
   * @param {string} page - Page identifier
   * @param {number} [startAt=0] - Step index to start at
   */
  function start(page, startAt) {
    if (state.active) endTutorial();
    var steps = tutorials[page];
    if (!steps || steps.length === 0) return;

    state.active = true;
    state.page = page;
    state.stepIndex = startAt || 0;
    state.steps = steps;

    createOverlay();
    renderStep();
  }

  /**
   * Reset progress for a page (or all)
   */
  function reset(page) {
    if (page) {
      delete state.completed[page];
    } else {
      state.completed = {};
    }
    saveProgress();
  }

  /**
   * Create the tutorial launch button (floating "?" icon)
   * @param {string} page - Page identifier
   */
  function createLaunchButton(page) {
    if (!tutorials[page]) return;

    var btn = document.createElement('button');
    btn.className = 'wi-tut-launch';
    btn.title = 'Start interactive tutorial';
    btn.setAttribute('aria-label', 'Start tutorial for this page');

    var progress = getPageProgress(page);
    var complete = isPageComplete(page);

    if (complete) {
      btn.innerHTML = '<span style="font-size:18px">&#10003;</span>';
      btn.classList.add('wi-tut-launch-done');
    } else if (progress > 0) {
      btn.innerHTML = '<span style="font-size:14px">' + progress + '%</span>';
    } else {
      btn.innerHTML = '<span style="font-size:18px">?</span>';
    }

    btn.addEventListener('click', function() {
      if (complete) {
        // Restart from beginning
        reset(page);
        btn.innerHTML = '<span style="font-size:18px">?</span>';
        btn.classList.remove('wi-tut-launch-done');
      }
      start(page);
    });

    document.body.appendChild(btn);
    return btn;
  }

  /**
   * Auto-initialize: check if page has registered tutorial, show button
   * Call this after registering steps
   */
  function autoInit(page) {
    // Wait for DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { createLaunchButton(page); });
    } else {
      // Small delay to let page render
      setTimeout(function() { createLaunchButton(page); }, 500);
    }
  }

  // ─── WINDOW RESIZE HANDLER ─────────────────────────────────────────

  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (state.active) renderStep();
    }, 150);
  });

  // ─── EXPORT ────────────────────────────────────────────────────────

  window.wiTutorial = {
    register: register,
    start: start,
    reset: reset,
    autoInit: autoInit,
    getProgress: getPageProgress,
    isComplete: isPageComplete,
    createLaunchButton: createLaunchButton
  };

})();
