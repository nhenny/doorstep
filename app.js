(function () {
  "use strict";

  var CONFIG = window.DOORSTEP_CONFIG || {};

  // ---------------------------------------------------------------------
  // Placeholder data. Structure is real (book -> lists -> areas -> houses);
  // the counts are placeholders until this reads from a backend. Default
  // names here are overridden by whatever the user has renamed things to
  // (see getBookName/getListName below).
  // ---------------------------------------------------------------------
  var DATA = [
    { id: "wl1", name: "List 1", areas: [
      { id: "a1", name: "Area 1", total: 18, done: 6 },
      { id: "a2", name: "Area 2", total: 24, done: 0 },
      { id: "a3", name: "Area 3", total: 12, done: 12 }
    ]},
    { id: "wl2", name: "List 2", areas: [
      { id: "a4", name: "Area 4", total: 30, done: 10 },
      { id: "a5", name: "Area 5", total: 15, done: 3 }
    ]},
    { id: "wl3", name: "List 3", areas: [
      { id: "a6", name: "Area 6", total: 20, done: 0 },
      { id: "a7", name: "Area 7", total: 22, done: 22 }
    ]}
  ];

  var STATUS_COLOR = {
    done: "#38c77f",
    notyet: "#e0a94c",
    refused: "#e2685c",
    upcoming: "#6b7480"
  };

  // ---------------------------------------------------------------------
  // Walk list / area list dropdown
  // ---------------------------------------------------------------------
  var panelInner = document.getElementById("panelInner");
  var trigger = document.getElementById("listTrigger");
  var panel = document.getElementById("listPanel");
  var backdrop = document.getElementById("panelBackdrop");
  var triggerValue = document.getElementById("triggerValue");
  var statValue = document.getElementById("statValue");

  // ---------------------------------------------------------------------
  // Editable names: the walkbook's own name, and each list's name. Stored
  // locally, overriding the defaults in DATA once the user renames
  // something — DATA itself is never mutated.
  // ---------------------------------------------------------------------
  var BOOK_NAME_KEY = "doorstep.bookName";
  var LIST_NAME_PREFIX = "doorstep.listName.";

  function getBookName() {
    try { return localStorage.getItem(BOOK_NAME_KEY) || "Walkbook"; } catch (e) { return "Walkbook"; }
  }
  function setBookName(name) {
    try { localStorage.setItem(BOOK_NAME_KEY, name); } catch (e) {}
  }
  function getListName(wl) {
    try { return localStorage.getItem(LIST_NAME_PREFIX + wl.id) || wl.name; } catch (e) { return wl.name; }
  }
  function setListName(wlId, name) {
    try { localStorage.setItem(LIST_NAME_PREFIX + wlId, name); } catch (e) {}
  }

  // A small "click the pencil to rename" control, shared by the walkbook's
  // name and each list's name. Returns a DOM node; onSave(newName) fires
  // once an edit is confirmed with a non-empty, changed value.
  function createEditableRow(initialText, onSave) {
    var container = document.createElement("span");
    container.className = "editable-name";

    var label = document.createElement("span");
    label.className = "editable-name-text";
    label.textContent = initialText;

    function startEdit(e) {
      e.stopPropagation();
      if (container.querySelector(".editable-name-input")) return; // already editing
      var input = document.createElement("input");
      input.type = "text";
      input.className = "editable-name-input";
      input.value = label.textContent;
      input.maxLength = 60;
      container.replaceChild(input, label);
      input.focus();
      input.select();

      function finish(save) {
        var newVal = input.value.trim();
        if (save && newVal && newVal !== label.textContent) {
          label.textContent = newVal;
          onSave(newVal);
        }
        if (input.parentNode === container) container.replaceChild(label, input);
      }
      input.addEventListener("blur", function () { finish(true); });
      input.addEventListener("keydown", function (ev) {
        ev.stopPropagation();
        if (ev.key === "Enter") { ev.preventDefault(); input.blur(); }
        else if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
      });
      input.addEventListener("click", function (ev) { ev.stopPropagation(); });
    }

    var editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "rename-btn";
    editBtn.setAttribute("aria-label", "Rename");
    editBtn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M4 20l4.6-1 10.1-10.1a2 2 0 0 0 0-2.8l-1.3-1.3a2 2 0 0 0-2.8 0L4.5 15l-1 4.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '</svg>';
    editBtn.addEventListener("click", startEdit);

    container.appendChild(label);
    container.appendChild(editBtn);
    return container;
  }

  // ---------------------------------------------------------------------
  // Real stops: addresses geocoded + route-optimized per area, stored
  // locally. Falls back to the example total/done counts above until an
  // area has real addresses added via the "+" button next to it.
  // ---------------------------------------------------------------------
  var STOPS_KEY_PREFIX = "doorstep.stops.";
  var currentAreaId = null;

  function loadStopsForArea(areaId) {
    try {
      var raw = localStorage.getItem(STOPS_KEY_PREFIX + areaId);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveStopsForArea(areaId, stops) {
    try { localStorage.setItem(STOPS_KEY_PREFIX + areaId, JSON.stringify(stops)); } catch (e) {}
  }
  // Tracks whether an area's stops came from the optimized "Build route"
  // flow (ordered, worth drawing a connecting line) or from a plain
  // screenshot-to-pins upload (no particular walking order — no line).
  function setStopsRouted(areaId, routed) {
    try { localStorage.setItem(STOPS_KEY_PREFIX + areaId + ".routed", routed ? "1" : "0"); } catch (e) {}
  }
  function isStopsRouted(areaId) {
    try { return localStorage.getItem(STOPS_KEY_PREFIX + areaId + ".routed") === "1"; } catch (e) { return false; }
  }
  function findAreaById(id) {
    for (var i = 0; i < DATA.length; i++) {
      for (var j = 0; j < DATA[i].areas.length; j++) {
        if (DATA[i].areas[j].id === id) return DATA[i].areas[j];
      }
    }
    return null;
  }
  function getAreaCounts(area) {
    var stops = loadStopsForArea(area.id);
    if (stops && stops.length) {
      var done = stops.filter(function (s) { return s.status === "done"; }).length;
      return { total: stops.length, done: done };
    }
    return { total: area.total, done: area.done };
  }

  function statusDotColor(counts) {
    if (counts.done === 0) return "var(--status-upcoming)";
    if (counts.done === counts.total) return "var(--status-done)";
    return "var(--status-notyet)";
  }

  function renderPanel() {
    panelInner.innerHTML = "";
    var heading = document.createElement("div");
    heading.className = "panel-heading";
    heading.appendChild(createEditableRow(getBookName(), function (newName) {
      setBookName(newName);
      if (!currentAreaId) triggerValue.textContent = newName;
    }));
    panelInner.appendChild(heading);

    DATA.forEach(function (wl) {
      var wrap = document.createElement("div");
      wrap.className = "walklist";
      wrap.id = "wrap-" + wl.id;

      var doneSum = 0, totalSum = 0;
      wl.areas.forEach(function (a) {
        var c = getAreaCounts(a);
        doneSum += c.done;
        totalSum += c.total;
      });

      var row = document.createElement("div");
      row.className = "walklist-row";

      var nameWrap = document.createElement("div");
      nameWrap.className = "wl-name-wrap";
      nameWrap.appendChild(createEditableRow(getListName(wl), function (newName) {
        setListName(wl.id, newName);
      }));

      var btn = document.createElement("button");
      btn.className = "walklist-btn";
      btn.setAttribute("aria-expanded", "false");
      btn.id = "btn-" + wl.id;
      btn.innerHTML =
        '<span class="wl-meta">' + doneSum + '/' + totalSum + '</span>' +
        '<svg class="chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
        '<path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btn.addEventListener("click", function () {
        var isOpen = wrap.classList.contains("open");
        document.querySelectorAll(".walklist.open").forEach(function (w) {
          w.classList.remove("open");
          w.querySelector(".walklist-btn").setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          wrap.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });

      row.appendChild(nameWrap);
      row.appendChild(btn);

      var areaWrap = document.createElement("div");
      areaWrap.className = "arealist";

      wl.areas.forEach(function (area) {
        var counts = getAreaCounts(area);

        var row = document.createElement("div");
        row.className = "area-row";

        var aBtn = document.createElement("button");
        aBtn.className = "area-btn";
        aBtn.id = "area-" + area.id;
        aBtn.innerHTML =
          '<span class="dot" style="background:' + statusDotColor(counts) + '"></span>' +
          '<span class="a-name">' + area.name + '</span>' +
          '<span class="a-progress">' + counts.done + '/' + counts.total + '</span>';
        aBtn.addEventListener("click", function () {
          selectArea(area, aBtn);
        });

        var stopsBtn = document.createElement("button");
        stopsBtn.className = "stops-btn";
        stopsBtn.type = "button";
        stopsBtn.setAttribute("aria-label", "Add addresses for " + area.name);
        stopsBtn.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<path d="M12 21C12 21 5 14.5 5 9.5C5 5.9 8.1 3 12 3C15.9 3 19 5.9 19 9.5C19 14.5 12 21 12 21Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
          '<path d="M12 7V12M9.5 9.5H14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
        stopsBtn.addEventListener("click", function () {
          openStopsModal(area);
        });

        row.appendChild(aBtn);
        row.appendChild(stopsBtn);
        areaWrap.appendChild(row);
      });

      wrap.appendChild(row);
      wrap.appendChild(areaWrap);
      panelInner.appendChild(wrap);
    });
  }

  function refreshAreaMeta() {
    renderPanel();
    try {
      var saved = localStorage.getItem("doorstep.selectedArea");
      if (saved) {
        var el = document.getElementById("area-" + saved);
        if (el) el.classList.add("selected");
      }
    } catch (e) {}
  }

  function activateArea(area) {
    currentAreaId = area.id;
    triggerValue.textContent = area.name;
    var counts = getAreaCounts(area);
    statValue.textContent = (counts.total - counts.done) + " of " + counts.total + " stops left";
    try { localStorage.setItem("doorstep.selectedArea", area.id); } catch (e) {}
    showStopsForArea(area);
  }

  function selectArea(area, aBtn) {
    document.querySelectorAll(".area-btn.selected").forEach(function (b) {
      b.classList.remove("selected");
    });
    aBtn.classList.add("selected");
    activateArea(area);
    closePanel();
  }

  function openPanel() {
    panel.classList.add("open");
    backdrop.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  }
  function closePanel() {
    panel.classList.remove("open");
    backdrop.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
    document.querySelectorAll(".walklist.open").forEach(function (w) {
      w.classList.remove("open");
      w.querySelector(".walklist-btn").setAttribute("aria-expanded", "false");
    });
  }

  trigger.addEventListener("click", function () {
    if (panel.classList.contains("open")) closePanel(); else openPanel();
  });
  backdrop.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePanel();
  });

  renderPanel();
  triggerValue.textContent = getBookName();

  try {
    var saved = localStorage.getItem("doorstep.selectedArea");
    if (saved) {
      var savedArea = findAreaById(saved);
      var el = document.getElementById("area-" + saved);
      if (savedArea && el) selectArea(savedArea, el);
    }
  } catch (e) {}

  // ---------------------------------------------------------------------
  // Bottom tab bar (Map / Stats / Profile)
  // ---------------------------------------------------------------------
  var tabButtons = document.querySelectorAll(".tab-btn");
  var screens = {
    map: document.getElementById("mapWrap"),
    stats: document.getElementById("statsScreen"),
    profile: document.getElementById("profileScreen")
  };

  function selectTab(name) {
    tabButtons.forEach(function (btn) {
      var isActive = btn.getAttribute("data-tab") === name;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    Object.keys(screens).forEach(function (key) {
      if (!screens[key]) return;
      screens[key].hidden = key !== name;
    });
  }

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectTab(btn.getAttribute("data-tab"));
    });
  });

  // ---------------------------------------------------------------------
  // Fallback preview map (shown until a Google Maps API key is set)
  // ---------------------------------------------------------------------
  var blocksEl = document.getElementById("blocks");
  var blockRects = [
    [3,3,13,17],[19,3,13,17],[35,3,13,17],[51,3,13,17],[67,3,13,17],[83,3,13,17],
    [3,23,13,17],[19,23,13,17],[35,23,13,17],[51,23,13,17],[67,23,13,17],[83,23,13,17],
    [3,43,13,17],[19,43,13,17],[35,43,13,17],[51,43,13,17],[67,43,13,17],[83,43,13,17],
    [3,63,13,17],[19,63,13,17],[35,63,13,17],[51,63,13,17],[67,63,13,17],[83,63,13,17],
    [3,83,13,14],[19,83,13,14],[35,83,13,14],[51,83,13,14],[67,83,13,14],[83,83,13,14]
  ];
  blockRects.forEach(function (r) {
    var b = document.createElement("div");
    b.className = "block";
    b.style.left = r[0] + "%";
    b.style.top = r[1] + "%";
    b.style.width = r[2] + "%";
    b.style.height = r[3] + "%";
    blocksEl.appendChild(b);
  });

  // ---------------------------------------------------------------------
  // Map controls: satellite toggle, search, locate + live heading track
  // ---------------------------------------------------------------------
  var satelliteToggle = document.getElementById("satelliteToggle");
  var searchToggle = document.getElementById("searchToggle");
  var searchPill = document.getElementById("searchPill");
  var searchInput = document.getElementById("searchInput");
  var fabLocate = document.getElementById("fabLocate");

  var satelliteOn = false;
  satelliteToggle.addEventListener("click", function () {
    satelliteOn = !satelliteOn;
    satelliteToggle.classList.toggle("active", satelliteOn);
    satelliteToggle.setAttribute("aria-pressed", satelliteOn ? "true" : "false");
    if (window.__doorstepMap) {
      window.__doorstepMap.setMapTypeId(satelliteOn ? "hybrid" : "roadmap");
    }
  });

  searchToggle.addEventListener("click", function () {
    var isOpen = searchPill.classList.toggle("open");
    searchToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      window.setTimeout(function () { searchInput.focus(); }, 150);
    } else {
      searchInput.blur();
    }
  });

  var geocoder = null;
  function setupSearch() {
    if (!window.google || !window.__doorstepMap) return;
    geocoder = new google.maps.Geocoder();
    searchInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      runSearch(searchInput.value.trim());
    });
  }

  function runSearch(query) {
    if (!query || !geocoder || !window.__doorstepMap) return;
    geocoder.geocode({ address: query }, function (results, status) {
      if (status !== "OK" || !results || !results[0]) {
        showMapBanner('Couldn’t find "' + query + '" — try a more specific address or city.', 6000);
        return;
      }
      var result = results[0];
      if (result.geometry.viewport) {
        window.__doorstepMap.fitBounds(result.geometry.viewport);
      } else {
        window.__doorstepMap.panTo(result.geometry.location);
        window.__doorstepMap.setZoom(16);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Add addresses -> geocode -> optimized walking route
  // ---------------------------------------------------------------------
  var stopsBackdrop = document.getElementById("stopsBackdrop");
  var stopsModal = document.getElementById("stopsModal");
  var stopsAreaName = document.getElementById("stopsAreaName");
  var stopsInput = document.getElementById("stopsInput");
  var stopsStatus = document.getElementById("stopsStatus");
  var stopsBuildBtn = document.getElementById("stopsBuildBtn");
  var stopsCancelBtn = document.getElementById("stopsCancelBtn");
  var stopsUploadBtn = document.getElementById("stopsUploadBtn");
  var stopsImageInput = document.getElementById("stopsImageInput");
  var activeStopsArea = null;

  function openStopsModal(area) {
    activeStopsArea = area;
    closePanel();
    stopsAreaName.textContent = "— " + area.name;
    var existing = loadStopsForArea(area.id);
    stopsInput.value = existing ? existing.slice().sort(function (a, b) { return a.order - b.order; }).map(function (s) { return s.address; }).join("\n") : "";
    stopsStatus.hidden = true;
    setStopsBusy(false);
    stopsModal.classList.add("open");
    stopsBackdrop.classList.add("open");
    window.setTimeout(function () { stopsInput.focus(); }, 150);
  }
  function closeStopsModal() {
    stopsModal.classList.remove("open");
    stopsBackdrop.classList.remove("open");
    activeStopsArea = null;
  }
  stopsCancelBtn.addEventListener("click", closeStopsModal);
  stopsBackdrop.addEventListener("click", closeStopsModal);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && stopsModal.classList.contains("open")) closeStopsModal();
  });

  function setStopsStatus(text, isError) {
    stopsStatus.textContent = text;
    stopsStatus.hidden = false;
    stopsStatus.classList.toggle("error", !!isError);
  }

  function setStopsBusy(busy) {
    stopsBuildBtn.disabled = busy;
    stopsUploadBtn.disabled = busy;
  }

  stopsBuildBtn.addEventListener("click", function () {
    if (!activeStopsArea) return;
    var lines = stopsInput.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) { setStopsStatus("Add at least one address.", true); return; }
    if (!window.__doorstepMap || !window.google) { setStopsStatus("The map isn't loaded yet — try again in a moment.", true); return; }
    buildRoute(activeStopsArea, lines);
  });

  // ---- Upload a screenshot of a list -> OCR -> fill the textarea ----
  var TESSERACT_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  var tesseractLoadPromise = null;

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    if (tesseractLoadPromise) return tesseractLoadPromise;
    tesseractLoadPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = TESSERACT_SRC;
      script.onload = function () { resolve(); };
      script.onerror = function () {
        tesseractLoadPromise = null;
        reject(new Error("Couldn't load the text-recognition library — check your internet connection."));
      };
      document.head.appendChild(script);
    });
    return tesseractLoadPromise;
  }

  // Recognize a household-list screenshot: pull out just the address and the
  // list number next to it (the same number shown under the blue pin icon),
  // ignoring names, statuses, and everything else in the row.
  var STREET_SUFFIX_RE = /\b(ROAD|RD|STREET|ST|AVENUE|AVE|LANE|LN|DRIVE|DR|COURT|CT|BOULEVARD|BLVD|WAY|PLACE|PL|CIRCLE|CIR|HIGHWAY|HWY|PARKWAY|PKWY|TRAIL|TRL|ROUTE|RTE|COUNTY|LOOP|TERRACE|TER|CROSSING|XING|PATH|ALLEY|ALY|SQUARE|SQ|PLAZA|PLZ)\b/i;

  function cleanAddressLine(text) {
    var t = text;
    var bracketIdx = t.indexOf("[");
    if (bracketIdx !== -1) t = t.slice(0, bracketIdx);
    t = t.replace(/\b(Not Started|In Progress|Completed|Restricted)\b.*$/i, "");
    t = t.replace(/[>›→]+\s*$/, "");
    return t.replace(/\s+/g, " ").trim();
  }

  function lineYCenter(bbox) { return (bbox.y0 + bbox.y1) / 2; }

  // Pairs each address line with the nearest stray leading number in the
  // same row band (the "1", "2", "3"... column), using OCR line positions
  // rather than text order, since the two don't always come out adjacent.
  function extractAddressNumberPairs(lines) {
    var addressLines = [];
    var numberLines = [];

    lines.forEach(function (line) {
      var text = (line.text || "").trim();
      if (!text) return;
      if (STREET_SUFFIX_RE.test(text)) {
        var cleaned = cleanAddressLine(text);
        if (cleaned.length >= 5 && /\d/.test(cleaned)) {
          addressLines.push({ text: cleaned, bbox: line.bbox });
        }
        return;
      }
      var m = text.match(/^(\d{1,4})\b/);
      if (m) numberLines.push({ num: m[1], bbox: line.bbox });
    });

    if (!addressLines.length) return [];

    // Typical row height, from the gaps between consecutive address lines —
    // used to keep a number from pairing with the wrong row.
    var rowHeight = Infinity;
    if (addressLines.length > 1) {
      var gaps = [];
      for (var i = 1; i < addressLines.length; i++) {
        gaps.push(Math.abs(lineYCenter(addressLines[i].bbox) - lineYCenter(addressLines[i - 1].bbox)));
      }
      gaps.sort(function (a, b) { return a - b; });
      rowHeight = gaps[Math.floor(gaps.length / 2)];
    }
    var threshold = isFinite(rowHeight) ? rowHeight * 0.75 : Infinity;

    var used = new Array(numberLines.length).fill(false);
    var pairs = addressLines.map(function (a) {
      var bestIdx = -1, bestDist = Infinity;
      numberLines.forEach(function (n, i) {
        if (used[i]) return;
        var d = Math.abs(lineYCenter(a.bbox) - lineYCenter(n.bbox));
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      var label = null;
      if (bestIdx !== -1 && bestDist <= threshold) {
        used[bestIdx] = true;
        label = numberLines[bestIdx].num;
      }
      return { address: a.text, label: label };
    });

    // Every pin still gets a number, even for a row we couldn't confidently match.
    pairs.forEach(function (p, i) { if (!p.label) p.label = String(i + 1); });

    return pairs;
  }

  stopsUploadBtn.addEventListener("click", function () {
    stopsImageInput.click();
  });

  stopsImageInput.addEventListener("change", function () {
    var files = stopsImageInput.files ? Array.prototype.slice.call(stopsImageInput.files) : [];
    stopsImageInput.value = ""; // allow re-selecting the same file(s) again later
    if (!files.length || !activeStopsArea) return;

    setStopsBusy(true);
    setStopsStatus(files.length === 1 ? "Reading the screenshot…" : "Reading screenshot 1 of " + files.length + "…");

    var allPairs = [];
    var unreadable = 0;

    function readNext(i) {
      if (i >= files.length) {
        if (!allPairs.length) {
          setStopsBusy(false);
          setStopsStatus("Couldn't make out any addresses in " + (files.length === 1 ? "that image" : "those images") + " — try clearer screenshots, or paste the addresses instead.", true);
          return;
        }
        stopsInput.value = allPairs.map(function (p) { return p.address; }).join("\n");
        buildPinsFromImage(activeStopsArea, allPairs, unreadable, files.length > 1);
        return;
      }
      if (files.length > 1) setStopsStatus("Reading screenshot " + (i + 1) + " of " + files.length + "…");
      Tesseract.recognize(files[i], "eng")
        .then(function (result) {
          var lines = (result && result.data && result.data.lines) || [];
          allPairs = allPairs.concat(extractAddressNumberPairs(lines));
          readNext(i + 1);
        })
        .catch(function () {
          unreadable++;
          readNext(i + 1);
        });
    }

    loadTesseract()
      .then(function () { readNext(0); })
      .catch(function (err) {
        setStopsBusy(false);
        setStopsStatus(err && err.message ? err.message : "Couldn't load the OCR engine.", true);
      });
  });

  // Places numbered pins straight on the map — no route optimization, just
  // matching the numbers from the screenshot. "Build route" (above) stays
  // available afterward for anyone who also wants an optimized order.
  function buildPinsFromImage(area, pairs, unreadableCount, isMultiple) {
    setStopsStatus("Looking up " + pairs.length + " address" + (pairs.length === 1 ? "" : "es") + "…");
    var addresses = pairs.map(function (p) { return p.address; });
    geocodeAll(addresses, function (err, geocoded, failed) {
      setStopsBusy(false);
      if (err) { setStopsStatus(err, true); return; }
      var stops = geocoded.map(function (g, i) {
        var match = pairs.filter(function (p) { return p.address === g.address; })[0];
        return {
          address: g.address,
          lat: g.lat,
          lng: g.lng,
          status: "upcoming",
          order: i,
          label: (match && match.label) || String(i + 1),
          approx: !!g.approx
        };
      });
      saveStopsForArea(area.id, stops);
      setStopsRouted(area.id, false);
      var areaBtnEl = document.getElementById("area-" + area.id);
      if (areaBtnEl) {
        document.querySelectorAll(".area-btn.selected").forEach(function (b) { b.classList.remove("selected"); });
        areaBtnEl.classList.add("selected");
      }
      activateArea(area);
      refreshAreaMeta();
      selectTab("map");
      var msg = "Added " + stops.length + " pin" + (stops.length === 1 ? "" : "s") + " to the map, numbered to match your screenshot" + (isMultiple ? "s" : "") + ".";
      var approxCount = stops.filter(function (s) { return s.approx; }).length;
      if (approxCount) msg += " " + approxCount + " " + (approxCount === 1 ? "is an estimate" : "are estimates") + " (faded pin) — tap one for details.";
      if (unreadableCount) msg += " Couldn't read " + unreadableCount + " of the images.";
      if (failed && failed.length) msg += " Couldn't find: " + failed.join(", ") + ".";
      setStopsStatus(msg);
    });
  }

  // Rural and unincorporated addresses (e.g. "4951 County Road 152") often
  // have no city/state for Google to disambiguate against — fall back to a
  // configured default region so those still geocode. Only look for an
  // existing state/ZIP after the LAST comma — checking the whole string
  // would mistake a plain 5-digit house number ("12555 County Road 153")
  // for a ZIP code and skip adding the region entirely.
  var STATE_ABBR_RE = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;
  function ensureRegion(address) {
    var trimmed = (address || "").trim();
    var commaIdx = trimmed.lastIndexOf(",");
    var tail = commaIdx !== -1 ? trimmed.slice(commaIdx) : "";
    if (tail && (STATE_ABBR_RE.test(tail) || /\b\d{5}(-\d{4})?\b/.test(tail))) return trimmed;
    var region = (CONFIG.DEFAULT_REGION || "").trim();
    return region ? (trimmed + ", " + region) : trimmed;
  }

  // ---- Distance + expanding-radius search, centered on the user ----
  // Addresses like "County Road 152" exist in dozens of states, so a plain
  // geocode call can come back with a match on the other side of the
  // country. Instead we search in rings out from the user's location —
  // tight at first, widening only if nothing turns up nearby — and among
  // whatever candidates Google returns, keep the one actually closest to
  // the user rather than assuming the first result is right.
  var SEARCH_RADII_MILES = [15, 50, 200, 800];

  function milesBetween(a, b) {
    var R = 3958.8; // Earth radius in miles
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLng = (b.lng - a.lng) * Math.PI / 180;
    var lat1 = a.lat * Math.PI / 180;
    var lat2 = b.lat * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function boundsAround(center, miles) {
    var latDelta = miles / 69; // ~69 miles per degree of latitude
    var lngDelta = miles / (69 * Math.max(0.15, Math.cos(center.lat * Math.PI / 180)));
    return new google.maps.LatLngBounds(
      { lat: center.lat - latDelta, lng: center.lng - lngDelta },
      { lat: center.lat + latDelta, lng: center.lng + lngDelta }
    );
  }

  // When Google can't actually place an address, it often doesn't say
  // ZERO_RESULTS — it quietly falls back to the surrounding city or county
  // instead (flagged with partial_match + a broad "political" type) which,
  // taken at face value, drops the pin miles from the real house and stacks
  // every unfindable address from the same list on top of one another.
  //
  // A "route" (or "intersection") match is the same problem in disguise:
  // it means Google couldn't find that specific house number and instead
  // handed back a single point somewhere along the whole road — every other
  // house number on that road gets the exact same coordinate, and for a
  // long rural county road that point can be miles from the real address
  // (this is why pins for rural addresses were landing scattered across
  // the whole region instead of clustered where they actually are). Only
  // a result Google could actually pin to a specific address or premise
  // counts as precise; a route/intersection match is treated as "couldn't
  // find" instead, same as a city/county-level fallback.
  var PRECISE_TYPES = { street_address: 1, premise: 1, subpremise: 1 };
  function isPreciseMatch(result) {
    var types = result.types || [];
    for (var i = 0; i < types.length; i++) {
      if (PRECISE_TYPES[types[i]]) return true;
    }
    return false;
  }

  // Even a "precise" (street_address/premise) result can still be a rough
  // guess: Google's location_type tells you how it was actually derived.
  // ROOFTOP means a real surveyed building location; RANGE_INTERPOLATED
  // means Google estimated a point along the block between two known
  // addresses — fine for a dense city block, but on a long rural road with
  // few reference points it can land far from the real house, and two
  // different house numbers can even interpolate to the identical point.
  // Prefer a rooftop match whenever one's available; fall back to an
  // interpolated one (flagged as approximate) rather than nothing.
  function pickBestCandidate(candidates, anchor, radius) {
    var best = null, bestDist = Infinity;
    var bestRooftop = null, bestRooftopDist = Infinity;
    candidates.forEach(function (r) {
      if (!isPreciseMatch(r)) return; // skip city/county-level fallbacks
      var loc = r.geometry.location;
      var d = milesBetween(anchor, { lat: loc.lat(), lng: loc.lng() });
      if (d < bestDist) { bestDist = d; best = r; }
      if (r.geometry.location_type === "ROOFTOP" && d < bestRooftopDist) {
        bestRooftopDist = d; bestRooftop = r;
      }
    });
    if (bestRooftop && (!radius || bestRooftopDist <= radius * 1.5)) return bestRooftop;
    if (best && (!radius || bestDist <= radius * 1.5)) return best;
    return null;
  }

  function geocodeNear(address, anchor, callback) {
    var i = 0;
    function tryTier() {
      if (i >= SEARCH_RADII_MILES.length) {
        // Widened all the way out and still nothing close — take whatever
        // Google's plain, unbiased answer is, as a last resort.
        geocoder.geocode({ address: address }, function (res, status) {
          var candidates = status === "OK" && res ? res : [];
          callback(pickBestCandidate(candidates, anchor, null));
        });
        return;
      }
      var radius = SEARCH_RADII_MILES[i++];
      geocoder.geocode({ address: address, bounds: boundsAround(anchor, radius) }, function (res, status) {
        if (status === "OK" && res && res.length) {
          // "bounds" only biases Google's results, it doesn't restrict them,
          // so pick whichever precise candidate is actually nearest the user
          // before deciding this tier found a real match.
          var chosen = pickBestCandidate(res, anchor, radius);
          if (chosen) { callback(chosen); return; }
        }
        tryTier(); // nothing close enough (or precise enough) yet — widen out
      });
    }
    tryTier();
  }

  // Government address locators, when configured for the area being
  // canvassed, give real address-point data instead of Google's best guess
  // — exactly the fix that solved this same "address not found" problem on
  // the Alliant utility-map project: pull from authoritative datasets
  // before ever falling back to Google. Every URL in CONFIG.LOCATOR_URLS is
  // an Esri "GeocodeServer" (the format most county/state/regional GIS
  // departments publish); they're all queried IN PARALLEL and the best hit
  // across all of them wins, so a second or third dataset only adds
  // coverage — it never slows things down waiting on ones that come up
  // empty. If none of them find anything, Google is still there as the
  // fallback. Leave CONFIG.LOCATOR_URLS empty to skip this and go straight
  // to Google.
  function geocodeEsriLocator(base, address, anchor, callback) {
    var url = base + "?" + [
      "SingleLine=" + encodeURIComponent(address),
      "location=" + encodeURIComponent(anchor.lng + "," + anchor.lat),
      "distance=80000", // meters (~50mi) — biases scoring toward the user, doesn't exclude farther matches
      "outSR=4326",
      "maxLocations=5",
      // Esri's GeocodeServer returns an EMPTY attributes object unless the
      // fields you want are named explicitly — without this, every
      // candidate's Addr_type comes back undefined, the filter below always
      // fails, and this locator silently never matches anything (every
      // address falls through to Google even when this authoritative
      // dataset actually has a precise result for it).
      "outFields=Addr_type,Match_addr",
      "f=json"
    ].join("&");

    var timedOut = false;
    var timer = window.setTimeout(function () { timedOut = true; callback(null); }, 6000);

    fetch(url).then(function (res) {
      return res.json();
    }).then(function (json) {
      if (timedOut) return;
      window.clearTimeout(timer);
      var candidates = (json && json.candidates) || [];
      var usable = candidates.filter(function (c) {
        var addrType = c.attributes && c.attributes.Addr_type;
        // A regional dataset can occasionally match the right house
        // number on a similarly-named road in the wrong county — a high
        // score floor is what keeps that from being accepted.
        return c.score >= 80 && (addrType === "PointAddress" || addrType === "StreetAddress");
      });
      // A real, surveyed PointAddress always wins over an interpolated
      // StreetAddress guess, even one that happened to score a little
      // higher — the category gap matters more than a few score points,
      // and picking by raw score alone was letting a rougher interpolated
      // match beat a precise one that was sitting right there.
      var pointMatches = usable.filter(function (c) { return c.attributes.Addr_type === "PointAddress"; });
      var pool = pointMatches.length ? pointMatches : usable;
      var best = pool.sort(function (a, b) { return b.score - a.score; })[0];
      if (!best) { callback(null); return; }
      // PointAddress is a real, surveyed rooftop location. StreetAddress is
      // interpolated along the block — much better than Google's nationwide
      // guess, but still an estimate, so it's flagged "approx" the same way
      // a Google RANGE_INTERPOLATED match is below.
      var addrType = best.attributes && best.attributes.Addr_type;
      callback({
        lat: best.location.y, lng: best.location.x,
        approx: addrType !== "PointAddress", score: best.score,
        trusted: true,
        // This locator's own coverage spans a huge 13-county region, so
        // "trusted" doesn't mean "unambiguous": the same road name/number
        // can be a real match in more than one of those counties (e.g. a
        // "County Road 227" that's real in both Grimes and Brazoria
        // county). Not specific enough on its own to anchor the rest of a
        // batch's search — see geocodeAll.
        specific: false
      });
    }).catch(function () {
      if (timedOut) return;
      window.clearTimeout(timer);
      callback(null); // network hiccup, CORS, or the service is down — just don't count this source
    });
  }

  // Splits "12481 Memory Ln" into { num: 12481, streetRaw: "MEMORY LN" }.
  // Addresses that don't start with a house number (a bad OCR read, a lot
  // number with no street) can't be looked up this way — null tells the
  // caller to skip this source for that address.
  function parseHouseAndStreet(address) {
    var m = /^\s*(\d+)\s+(.+)$/.exec((address || "").trim());
    if (!m) return null;
    return { num: parseInt(m[1], 10), streetRaw: m[2].trim().toUpperCase() };
  }

  // Turns a street name into comparable tokens, collapsing the common
  // longhand/abbreviation spellings of rural road types onto one spelling
  // ("COUNTY ROAD" and "CO RD" and "COUNTY RD" all become "CR") so
  // "County Road 152" and "CR 152" are recognized as the same road.
  function normalizeStreetTokens(street) {
    return (street || "")
      .toUpperCase()
      .replace(/\bCOUNTY\s+ROAD\b/g, "CR")
      .replace(/\bCO\s+RD\b/g, "CR")
      .replace(/\bCOUNTY\s+RD\b/g, "CR")
      .replace(/\bFARM[\s-]TO[\s-]MARKET\s+ROAD\b/g, "FM")
      .replace(/\bFM\s+ROAD\b/g, "FM")
      .replace(/\bSTREET\b/g, "ST")
      .replace(/\bAVENUE\b/g, "AVE")
      .replace(/\bDRIVE\b/g, "DR")
      .replace(/\bLANE\b/g, "LN")
      .replace(/\bROAD\b/g, "RD")
      .replace(/\bBOULEVARD\b/g, "BLVD")
      .replace(/\bCOURT\b/g, "CT")
      .replace(/\bCIRCLE\b/g, "CIR")
      .replace(/\bSTATE\s+HIGHWAY\b/g, "HWY")
      .replace(/\bSTATE\s+HWY\b/g, "HWY")
      .replace(/\bUS\s+HIGHWAY\b/g, "HWY")
      .replace(/\bHIGHWAY\b/g, "HWY")
      .replace(/\bSH\b/g, "HWY") // TxDOT shorthand: "SH 90" = "State Highway 90"
      .replace(/\bUS\b/g, "HWY")
      // Some county datasets store the abbreviation with no space at all
      // ("CR152" rather than "CR 152") — split those apart too, so the
      // number still ends up as its own token instead of being fused onto
      // the letters and never matching.
      .replace(/([A-Z])(\d)/g, "$1 $2")
      .replace(/(\d)([A-Z])/g, "$1 $2")
      .replace(/[^A-Z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  // A loose substring check on a bare road number is dangerous: searching
  // for "152" with String.indexOf() also matches "1520", "1523", "2152" —
  // entirely different roads that happen to contain the same digits. This
  // only accepts a candidate when every NUMBER in the address being looked
  // up (the "152" in "County Road 152") appears as its own exact token in
  // the candidate's street name, not merely somewhere inside a longer
  // number, plus at least one of the non-number words lines up too (so a
  // bare number match can't pass on its own). Real, driveable-precision
  // matching over "probably close enough" — a wrong number here sends
  // someone to a different road entirely, which is worse than not finding
  // the address at all.
  // Bare compass-direction tokens ("N", "S", "E", "W", and the two-letter
  // combinations) are dropped when deciding whether two street names are
  // "the same road" — real-world example: a canvasser's own list had
  // "Highway 90 N", but the county's own record for that exact house is
  // just "HWY90", no direction at all. Even Google/Apple Maps' own search
  // silently drops a trailing "N" like this rather than treat it as
  // required. Requiring it to match was rejecting a real, correct county
  // record and sending the address to Google's nationwide guesser instead
  // — which is how it ended up in a different city entirely.
  var DIRECTION_TOKENS = { N: 1, S: 1, E: 1, W: 1, NE: 1, NW: 1, SE: 1, SW: 1 };
  function streetTokensMatch(queryTokens, candidateTokens) {
    var queryNums = queryTokens.filter(function (t) { return /^\d+$/.test(t); });
    if (queryNums.length) {
      var allNumsMatch = queryNums.every(function (n) { return candidateTokens.indexOf(n) !== -1; });
      if (!allNumsMatch) return false;
    }
    var queryWords = queryTokens.filter(function (t) { return !/^\d+$/.test(t) && !DIRECTION_TOKENS[t]; });
    if (!queryWords.length) return queryNums.length > 0;
    return queryWords.some(function (w) { return candidateTokens.indexOf(w) !== -1; });
  }

  // Ranks raw feature candidates against the parsed address, returning the
  // best strict token match (see streetTokensMatch) or null if nothing
  // passes — silence beats a confident wrong answer here.
  function bestStreetMatch(feats, parsed, streetFieldGetter) {
    var queryTokens = normalizeStreetTokens(parsed.streetRaw);
    var best = null, bestScore = -1;
    feats.forEach(function (f) {
      var candidateTokens = normalizeStreetTokens(streetFieldGetter(f));
      if (!streetTokensMatch(queryTokens, candidateTokens)) return;
      // Among valid matches, prefer the one sharing the most tokens overall
      // (handles a few real duplicate-numbered-road edge cases cleanly).
      var score = queryTokens.filter(function (t) { return candidateTokens.indexOf(t) !== -1; }).length;
      if (score > bestScore) { bestScore = score; best = f; }
    });
    return best;
  }

  // Montgomery County's own E-911 address-point layer isn't a geocoder —
  // it's a raw, queryable table of real addresses (house number + street +
  // exact lat/lng), so instead of a fuzzy text search we query it directly:
  // exact house number, then a loose LIKE on the street so it still matches
  // whether the county spells it "County Rd" or "CR" or "County Road" (the
  // LIKE only narrows what comes back from the server — see
  // bestStreetMatch for the strict client-side check that actually decides
  // whether a candidate is trusted).
  function geocodeCountyPoints(base, address, callback) {
    var parsed = parseHouseAndStreet(address);
    if (!parsed) { callback(null); return; }
    var numHint = parsed.streetRaw.match(/\d+/);
    var hint = numHint ? numHint[0] : (parsed.streetRaw.split(/\s+/)[0] || parsed.streetRaw);
    var where = "STR_NUM=" + parsed.num + " AND STREET LIKE '%" + hint.replace(/'/g, "''") + "%'";
    var url = base + "?" + [
      "where=" + encodeURIComponent(where),
      "outFields=STREET,ADDRESS,LATCOORDY,LONCOORDX",
      "resultRecordCount=50",
      "f=json"
    ].join("&");

    var timedOut = false;
    var timer = window.setTimeout(function () { timedOut = true; callback(null); }, 6000);

    fetch(url).then(function (res) {
      return res.json();
    }).then(function (json) {
      if (timedOut) return;
      window.clearTimeout(timer);
      var feats = (json && json.features) || [];
      if (!feats.length) { callback(null); return; }
      var best = bestStreetMatch(feats, parsed, function (f) { return f.attributes.STREET; });
      if (!best) { callback(null); return; }
      // This is the county's own ground-truth 911 addressing data — a
      // strictly matched point is exact, not an estimate. It's also scoped
      // to one specific county (unlike the big regional locators above),
      // so a match here is a reliable signal for where THIS list actually
      // is — see geocodeAll.
      callback({ lat: best.attributes.LATCOORDY, lng: best.attributes.LONCOORDX, approx: false, score: 100, trusted: true, specific: true });
    }).catch(function () {
      if (timedOut) return;
      window.clearTimeout(timer);
      callback(null);
    });
  }

  // Several rural county CAD (appraisal-district) offices run the same "BIS
  // Consultants" GIS platform, which exposes property PARCELS (not address
  // points) through an Esri FeatureServer. There's no lat/lng column to
  // read directly — instead we ask Esri to hand back each matching parcel's
  // polygon CENTROID (returnCentroid=true, returnGeometry=false so we don't
  // have to download the full shape). A parcel centroid is the middle of
  // the property line, not the house itself, so on a large or irregular
  // rural lot the pin can land a real distance from the front door — the
  // same limitation you can see in i360's own pins for these same roads
  // (close to the house but not on it, sometimes down the street). It's
  // still a specific real point instead of "not found," so results are
  // always flagged approx: true so the UI shows the faded pin + warning.
  //
  // Schema note: unlike Montgomery's E-911 points (STR_NUM as a number,
  // STREET as the field name), this platform stores the house number as
  // TEXT (situs_num) and needs the value quoted in the WHERE clause even
  // though it looks numeric — an unquoted STR_NUM=... clause silently
  // matches nothing here.
  function geocodeParcelCentroid(base, address, callback) {
    var parsed = parseHouseAndStreet(address);
    if (!parsed) { callback(null); return; }
    var numHint = parsed.streetRaw.match(/\d+/);
    var hint = numHint ? numHint[0] : (parsed.streetRaw.split(/\s+/)[0] || parsed.streetRaw);
    var where = "situs_num='" + String(parsed.num).replace(/'/g, "''") + "' AND situs_street LIKE '%" + hint.replace(/'/g, "''") + "%'";
    var url = base + "?" + [
      "where=" + encodeURIComponent(where),
      "outFields=situs_num,situs_street,file_as_name",
      "returnCentroid=true",
      "returnGeometry=false",
      "outSR=4326",
      "resultRecordCount=50",
      "f=json"
    ].join("&");

    var timedOut = false;
    var timer = window.setTimeout(function () { timedOut = true; callback(null); }, 6000);

    fetch(url).then(function (res) {
      return res.json();
    }).then(function (json) {
      if (timedOut) return;
      window.clearTimeout(timer);
      var feats = (json && json.features) || [];
      if (!feats.length) { callback(null); return; }
      var best = bestStreetMatch(feats, parsed, function (f) { return f.attributes.situs_street; });
      if (!best || !best.centroid) { callback(null); return; }
      // Scoped to one specific rural county's own property records —
      // like Montgomery's E-911 points, a real signal for where this
      // list actually is, not just "some plausible match" — see
      // geocodeAll.
      callback({ lat: best.centroid.y, lng: best.centroid.x, approx: true, score: 60, trusted: true, specific: true });
    }).catch(function () {
      if (timedOut) return;
      window.clearTimeout(timer);
      callback(null);
    });
  }

  function geocodeLocator(address, anchor, callback) {
    var tasks = [];
    (CONFIG.LOCATOR_URLS || []).forEach(function (base) {
      tasks.push(function (done) { geocodeEsriLocator(base, address, anchor, done); });
    });
    if (CONFIG.MONTGOMERY_POINTS_URL) {
      tasks.push(function (done) { geocodeCountyPoints(CONFIG.MONTGOMERY_POINTS_URL, address, done); });
    }
    (CONFIG.PARCEL_LOCATOR_URLS || []).forEach(function (base) {
      tasks.push(function (done) { geocodeParcelCentroid(base, address, done); });
    });
    if (!tasks.length) { callback(null); return; }

    var pending = tasks.length;
    var found = [];
    function taskDone(result) {
      if (result) found.push(result);
      pending--;
      if (pending > 0) return;
      if (!found.length) { callback(null); return; }
      // Two different sources can each return a real, valid-looking match
      // for the same address TEXT in two totally different PLACES — a
      // same-named highway in a different county, for instance. Precision
      // type (rooftop vs. interpolated/approximate) says nothing about
      // which one is actually correct; it only ranks candidates that are
      // already agreed to be roughly the same real-world spot. So distance
      // to the search anchor is checked first: when candidates disagree by
      // more than a couple of miles, they can't both be the same place,
      // and the one nearer the anchor is almost certainly the real one for
      // this search. Only once candidates agree on roughly where they are
      // does precision/score break the tie.
      found.forEach(function (r) { r._dist = milesBetween(anchor, { lat: r.lat, lng: r.lng }); });
      found.sort(function (a, b) {
        if (Math.abs(a._dist - b._dist) > 2) return a._dist - b._dist;
        if (!!a.approx !== !!b.approx) return a.approx ? 1 : -1;
        return (b.score || 0) - (a.score || 0);
      });
      callback(found[0]);
    }
    tasks.forEach(function (task) { task(taskDone); });
  }

  function geocodeOne(addr, anchor, callback) {
    geocodeLocator(addr, anchor, function (locatorResult) {
      if (locatorResult) { callback(locatorResult); return; }
      geocodeNear(ensureRegion(addr), anchor, function (result) {
        if (!result) { callback(null); return; }
        callback({
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          approx: result.geometry.location_type !== "ROOFTOP",
          // Google's plain nationwide geocoder, with no authoritative local
          // dataset behind it — it picks the nearest-to-anchor candidate
          // among however many places share that address text, which is
          // exactly the failure mode that put "20720 Highway 90" in the
          // wrong county: a real ROOFTOP match, just for the wrong one.
          // Never trusted enough to anchor the rest of a batch's search —
          // see geocodeAll.
          trusted: false
        });
      });
    });
  }

  function centroidOf(points) {
    var sumLat = 0, sumLng = 0;
    points.forEach(function (p) { sumLat += p.lat; sumLng += p.lng; });
    return { lat: sumLat / points.length, lng: sumLng / points.length };
  }

  // Looks up every address in the list against one fixed anchor point,
  // one at a time (serialized with a short delay — Google's Geocoding API
  // has a per-second rate limit).
  function geocodeBatch(addresses, anchor, callback) {
    var results = [];
    var failed = [];
    var i = 0;
    function next() {
      if (i >= addresses.length) { callback(results, failed); return; }
      var addr = addresses[i++];
      geocodeOne(addr, anchor, function (result) {
        if (result) {
          results.push({ address: addr, lat: result.lat, lng: result.lng, approx: !!result.approx, trusted: !!result.trusted, specific: !!result.specific });
        } else {
          failed.push(addr);
        }
        window.setTimeout(next, 180); // stay well under Geocoding's per-second rate limit
      });
    }
    next();
  }

  function geocodeAll(addresses, callback) {
    if (!geocoder) geocoder = new google.maps.Geocoder();
    getUserAnchor(function (anchor) {
      geocodeBatch(addresses, anchor, function (results, failed) {
        // A walk list is one cluster of addresses in one place. The search
        // above widens outward from "anchor" — the phone's current GPS, or
        // a generic regional fallback if that's unavailable — and takes
        // the nearest plausible-looking match at each radius tier. If the
        // list is actually somewhere far from that anchor (built ahead of
        // time from home or an office, or GPS wasn't available), that
        // widening can settle for a real address that just happens to be
        // closer to the anchor than the correct one much farther out —
        // and this isn't rare: the big regional locators cover a 13-county
        // area, so the SAME road name/number is often a real address in
        // more than one of those counties (a "County Road 227" that's a
        // genuine address in both Grimes county and, 90 miles away,
        // Brazoria county). Typically MOST of a rural list ends up
        // affected this way, not just one outlier address, which rules
        // out trying to spot individual bad results — the only reliable
        // fix is finding out where the list actually is and re-checking
        // everything against that.
        //
        // The county-specific sources (Montgomery's E-911 points, and the
        // Grimes/Walker/San Jacinto parcel records) are what settle that:
        // each one only covers a single small county, so a match from one
        // of them is a real, near-unambiguous signal for where this list
        // is — unlike the big regional locators, which can plausibly
        // answer for the same address text anywhere across 13 counties.
        // Once ANY of those specific sources produces even one hit, its
        // location is a far better search anchor than the original guess,
        // so every address gets looked up again with that anchor —
        // letting geocodeLocator's own nearest-to-anchor tie-break (see
        // above) correctly prefer the real, nearby match over a
        // same-named one from the wrong county, for the whole list at
        // once, not just whichever addresses a first pass happened to
        // flag as suspicious.
        var specific = results.filter(function (r) { return r.specific; });
        if (!specific.length) { finish(results, failed); return; }
        var refined = centroidOf(specific.map(function (r) { return { lat: r.lat, lng: r.lng }; }));
        if (milesBetween(anchor, refined) < 15) { finish(results, failed); return; } // anchor was already fine
        geocodeBatch(addresses, refined, function (results2, failed2) {
          finish(results2, failed2);
        });
      });
    });
    function finish(results, failed) {
      if (!results.length) { callback("Couldn't find any of those addresses. Try including city and state."); return; }
      callback(null, results, failed);
    }
  }

  function optimizeRoute(points, callback) {
    if (points.length <= 2) { callback(null, points); return; }
    if (!window.__directionsService) window.__directionsService = new google.maps.DirectionsService();
    var origin = points[0];
    var destination = points[points.length - 1];
    var waypoints = points.slice(1, -1).map(function (p) {
      return { location: { lat: p.lat, lng: p.lng }, stopover: true };
    });
    window.__directionsService.route({
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      waypoints: waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.WALKING
    }, function (result, status) {
      if (status !== "OK" || !result) {
        callback(null, points); // fall back to the order they were typed in
        return;
      }
      var order = result.routes[0].waypoint_order;
      var ordered = [origin];
      order.forEach(function (idx) { ordered.push(points[1 + idx]); });
      ordered.push(destination);
      callback(null, ordered);
    });
  }

  function buildRoute(area, addresses) {
    setStopsBusy(true);
    setStopsStatus("Looking up " + addresses.length + " address" + (addresses.length === 1 ? "" : "es") + "…");
    geocodeAll(addresses, function (err, geocoded, failed) {
      if (err) {
        setStopsBusy(false);
        setStopsStatus(err, true);
        return;
      }
      setStopsStatus("Building the fastest walking route…");
      optimizeRoute(geocoded, function (err2, ordered) {
        setStopsBusy(false);
        if (err2) { setStopsStatus(err2, true); return; }
        var stops = ordered.map(function (o, i) {
          return { address: o.address, lat: o.lat, lng: o.lng, status: "upcoming", order: i, label: String(i + 1), approx: !!o.approx };
        });
        saveStopsForArea(area.id, stops);
        setStopsRouted(area.id, true);
        var areaBtnEl = document.getElementById("area-" + area.id);
        if (areaBtnEl) {
          document.querySelectorAll(".area-btn.selected").forEach(function (b) { b.classList.remove("selected"); });
          areaBtnEl.classList.add("selected");
        }
        closeStopsModal();
        activateArea(area);
        refreshAreaMeta();
        selectTab("map"); // make sure the built route is actually visible
        var approxCount = stops.filter(function (s) { return s.approx; }).length;
        var bannerMsg = "";
        if (failed && failed.length) bannerMsg = "Route built, but couldn't find: " + failed.join(", ") + ".";
        if (approxCount) {
          bannerMsg += (bannerMsg ? " " : "Route built. ") + approxCount + " stop" + (approxCount === 1 ? " is an estimate" : "s are estimates") + " (faded pins) — tap one for details.";
        }
        if (bannerMsg) showMapBanner(bannerMsg, 8000);
      });
    });
  }

  // ---- Stop markers + route line on the map ----
  var STATUS_CYCLE = ["upcoming", "done", "notyet", "refused"];
  var STATUS_LABEL = { upcoming: "Not yet visited", done: "Completed", notyet: "Not home", refused: "Refused" };
  var stopMarkers = [];
  var stopPolyline = null;
  var stopInfoWindow = null;

  // Builds the pin popup as real DOM nodes (not an HTML string) so the
  // address text never needs escaping and each status button gets its own
  // click handler directly, no id lookups after the fact.
  function buildStopPopup(stop, marker, area, stops, fallbackLabel) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "font:500 12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color:#111;min-width:190px;max-width:230px;";

    var title = document.createElement("div");
    title.style.cssText = "font:700 13px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;margin-bottom:8px;";
    title.textContent = "#" + (stop.label || fallbackLabel || "") + " · " + stop.address;
    wrap.appendChild(title);

    if (stop.approx) {
      var note = document.createElement("div");
      note.style.cssText = "font:600 11px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;color:#a15c00;background:#fff3dc;border-radius:6px;padding:5px 7px;margin-bottom:8px;";
      note.textContent = "Estimated location — this address couldn't be matched exactly, so the pin may be off by some distance.";
      wrap.appendChild(note);
    }

    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:6px;";

    STATUS_CYCLE.forEach(function (statusKey) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = STATUS_LABEL[statusKey];
      var isActive = stop.status === statusKey;
      btn.style.cssText =
        "font:600 11px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;padding:6px 4px;border-radius:6px;cursor:pointer;" +
        "border:1.5px solid " + (isActive ? STATUS_COLOR[statusKey] : "#d8dbe0") + ";" +
        "background:" + (isActive ? STATUS_COLOR[statusKey] : "#fff") + ";" +
        "color:" + (isActive ? "#fff" : "#333") + ";";
      btn.addEventListener("click", function () {
        stop.status = statusKey;
        marker.setIcon(stopIcon(stop.status, stop.approx));
        saveStopsForArea(area.id, stops);
        if (currentAreaId === area.id) {
          var counts = getAreaCounts(area);
          statValue.textContent = (counts.total - counts.done) + " of " + counts.total + " stops left";
        }
        refreshAreaMeta();
        stopInfoWindow.setContent(buildStopPopup(stop, marker, area, stops, fallbackLabel)); // re-render to show the new active state
      });
      btnRow.appendChild(btn);
    });

    wrap.appendChild(btnRow);
    return wrap;
  }

  function clearStopMarkers() {
    stopMarkers.forEach(function (m) { m.setMap(null); });
    stopMarkers = [];
    if (stopPolyline) { stopPolyline.setMap(null); stopPolyline = null; }
    if (stopInfoWindow) stopInfoWindow.close();
  }

  function showStopsForArea(area) {
    clearStopMarkers();
    if (!window.__doorstepMap) return;
    var stops = loadStopsForArea(area.id);
    if (stops && stops.length) renderStopsOnMap(area, stops);
  }

  // "approx" pins came from an interpolated guess (a range estimate along a
  // road, not a real surveyed location) rather than a rooftop-precise
  // match — faded out and given a dashed outline so it visually reads as
  // "roughly here" rather than "exactly here".
  function stopIcon(status, approx) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: STATUS_COLOR[status] || STATUS_COLOR.upcoming,
      fillOpacity: approx ? 0.55 : 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      strokeOpacity: approx ? 0.6 : 1
    };
  }

  function renderStopsOnMap(area, stops) {
    clearStopMarkers();
    if (!window.__doorstepMap || !stops.length) return;
    var path = [];
    stops.forEach(function (stop, i) {
      var pos = { lat: stop.lat, lng: stop.lng };
      path.push(pos);
      var marker = new google.maps.Marker({
        position: pos,
        map: window.__doorstepMap,
        label: { text: stop.label || String(i + 1), color: "#ffffff", fontSize: "11px", fontWeight: "700" },
        icon: stopIcon(stop.status, stop.approx),
        title: stop.address + (stop.approx ? " (estimated location)" : ""),
        zIndex: 500
      });
      marker.addListener("click", function () {
        if (!stopInfoWindow) stopInfoWindow = new google.maps.InfoWindow();
        stopInfoWindow.setContent(buildStopPopup(stop, marker, area, stops, String(i + 1)));
        stopInfoWindow.open({ map: window.__doorstepMap, anchor: marker });
      });
      stopMarkers.push(marker);
    });
    // Only draw a connecting line when these stops came from "Build route" —
    // plain pins-from-a-screenshot aren't in any particular walking order.
    if (isStopsRouted(area.id)) {
      stopPolyline = new google.maps.Polyline({
        path: path,
        map: window.__doorstepMap,
        strokeColor: "#2fd6c3",
        strokeOpacity: 0.85,
        strokeWeight: 3
      });
    }
    var bounds = new google.maps.LatLngBounds();
    path.forEach(function (p) { bounds.extend(p); });
    window.__doorstepMap.fitBounds(bounds, 60);
  }

  // ---- Personal location: recenter + live tracking + heading rotation ----
  var tracking = false;
  var watchId = null;
  var youMarker = null;
  var headingHandler = null;
  var currentHeading = 0;

  function ensureYouMarker(position) {
    if (!window.__doorstepMap) return;
    if (!youMarker) {
      youMarker = new google.maps.Marker({
        position: position,
        map: window.__doorstepMap,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          rotation: currentHeading,
          fillColor: "#2fd6c3",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        },
        zIndex: 999
      });
    } else {
      youMarker.setPosition(position);
    }
  }

  function updateMarkerRotation() {
    if (!youMarker) return;
    var icon = youMarker.getIcon();
    icon.rotation = currentHeading;
    youMarker.setIcon(icon);
  }

  var lastKnownPosition = null;

  function onPosition(pos) {
    var latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    lastKnownPosition = latLng;
    ensureYouMarker(latLng);
    if (window.__doorstepMap) {
      window.__doorstepMap.panTo(latLng);
    }
  }

  function onPositionError() {
    showMapBanner("Couldn't get your location — check location permissions.", 6000);
    stopTracking();
  }

  // Best-known location to search outward from when geocoding addresses.
  // Reuses live tracking's last fix if it's already running; otherwise asks
  // for a single quick position (falling back to the app's default map
  // center if location isn't available or permission is denied).
  function getUserAnchor(callback) {
    if (lastKnownPosition) { callback(lastKnownPosition); return; }
    var fallback = (CONFIG && CONFIG.MAP_CENTER) || { lat: 42.5006, lng: -90.6648 };
    if (!navigator.geolocation) { callback(fallback); return; }
    var settled = false;
    var timer = window.setTimeout(function () {
      if (settled) return;
      settled = true;
      callback(fallback);
    }, 4000);
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        lastKnownPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        callback(lastKnownPosition);
      },
      function () {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        callback(fallback);
      },
      { maximumAge: 5 * 60 * 1000, timeout: 4000 }
    );
  }

  function onOrientation(event) {
    var heading = null;
    if (typeof event.webkitCompassHeading === "number") {
      heading = event.webkitCompassHeading; // iOS Safari: already true-north heading
    } else if (event.absolute && typeof event.alpha === "number") {
      heading = 360 - event.alpha;
    } else if (typeof event.alpha === "number") {
      heading = 360 - event.alpha;
    }
    if (heading === null || isNaN(heading)) return;
    currentHeading = heading;

    if (CONFIG.MAP_ID && window.__doorstepMap && window.__doorstepMap.moveCamera) {
      window.__doorstepMap.moveCamera({ heading: heading, tilt: 0 });
      updateMarkerRotation(); // keep arrow pointing "up" on a rotated map
      var icon = youMarker && youMarker.getIcon();
      if (icon) { icon.rotation = 0; youMarker.setIcon(icon); }
    } else {
      updateMarkerRotation();
    }
  }

  function startOrientation() {
    var attach = function () {
      if ("ondeviceorientationabsolute" in window) {
        headingHandler = onOrientation;
        window.addEventListener("deviceorientationabsolute", headingHandler);
      } else if ("DeviceOrientationEvent" in window) {
        headingHandler = onOrientation;
        window.addEventListener("deviceorientation", headingHandler);
      }
    };
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then(function (state) {
        if (state === "granted") attach();
      }).catch(function () {});
    } else {
      attach();
    }
  }

  function stopOrientation() {
    if (headingHandler) {
      window.removeEventListener("deviceorientationabsolute", headingHandler);
      window.removeEventListener("deviceorientation", headingHandler);
      headingHandler = null;
    }
    if (CONFIG.MAP_ID && window.__doorstepMap && window.__doorstepMap.moveCamera) {
      window.__doorstepMap.moveCamera({ heading: 0, tilt: 0 });
    }
    currentHeading = 0;
    if (youMarker) updateMarkerRotation();
  }

  function startTracking() {
    if (!navigator.geolocation) {
      showMapBanner("Location isn't available in this browser.", 6000);
      return;
    }
    tracking = true;
    fabLocate.classList.add("active");
    fabLocate.setAttribute("aria-pressed", "true");
    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });
    startOrientation();
  }

  function stopTracking() {
    tracking = false;
    fabLocate.classList.remove("active");
    fabLocate.setAttribute("aria-pressed", "false");
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    stopOrientation();
  }

  fabLocate.addEventListener("click", function () {
    if (window.__doorstepMap) {
      if (tracking) {
        stopTracking();
      } else {
        startTracking();
      }
    } else {
      var you = document.querySelector(".you-are-here");
      if (you) { you.style.left = "52%"; you.style.top = "58%"; }
    }
  });

  // ---------------------------------------------------------------------
  // Live Google Map (loads only once GOOGLE_MAPS_API_KEY is set)
  // ---------------------------------------------------------------------
  var mapFallback = document.getElementById("mapFallback");
  var mapBanner = document.getElementById("mapBanner");
  var mapBannerText = document.getElementById("mapBannerText");

  window.initDoorstepMap = function initDoorstepMap() {
    try {
      var mapOptions = {
        center: CONFIG.MAP_CENTER,
        zoom: CONFIG.MAP_ZOOM || 15,
        disableDefaultUI: true,
        zoomControl: false,
        clickableIcons: false
      };
      if (CONFIG.MAP_ID) mapOptions.mapId = CONFIG.MAP_ID;

      var map = new google.maps.Map(document.getElementById("map"), mapOptions);

      window.__doorstepMap = map;

      // Clicking a marker never reaches this listener (Google stops that
      // propagation itself), so this only fires for clicks on open map
      // area — exactly when the stop popup should close.
      map.addListener("click", function () {
        if (stopInfoWindow) stopInfoWindow.close();
      });

      mapFallback.hidden = true;
      hideMapBanner();

      setupSearch();

      if (currentAreaId) {
        var activeArea = findAreaById(currentAreaId);
        if (activeArea) showStopsForArea(activeArea);
      }
    } catch (err) {
      showMapBanner("Map failed to load — check the API key and its referrer restrictions in config.js.");
    }
  };

  // A one-off result (a search miss, a route that couldn't find every
  // address) should clear itself after a few seconds instead of sitting on
  // screen forever — pass autoHideMs for those. A banner describing an
  // ongoing state (no API key configured, the map failed to load) is left
  // to sit until something actually changes that state, so leave
  // autoHideMs off for those.
  var mapBannerHideTimer = null;
  function showMapBanner(text, autoHideMs) {
    mapBannerText.textContent = text;
    mapBanner.hidden = false;
    if (mapBannerHideTimer) { window.clearTimeout(mapBannerHideTimer); mapBannerHideTimer = null; }
    if (autoHideMs) {
      mapBannerHideTimer = window.setTimeout(function () {
        mapBanner.hidden = true;
        mapBannerHideTimer = null;
      }, autoHideMs);
    }
  }

  function hideMapBanner() {
    if (mapBannerHideTimer) { window.clearTimeout(mapBannerHideTimer); mapBannerHideTimer = null; }
    mapBanner.hidden = true;
  }

  function loadGoogleMaps() {
    var key = CONFIG.GOOGLE_MAPS_API_KEY;
    if (!key) {
      showMapBanner("Add a Google Maps API key in config.js to load the live map — showing a preview for now.");
      return;
    }
    var script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(key) + "&callback=initDoorstepMap";
    script.async = true;
    script.defer = true;
    script.onerror = function () {
      showMapBanner("Couldn't load Google Maps — check your internet connection or API key.");
    };
    document.head.appendChild(script);

    // If the key is bad, Google's script often loads but never calls back.
    window.setTimeout(function () {
      if (!window.__doorstepMap) {
        showMapBanner("Map is taking a while to load — double check the API key in config.js.");
      }
    }, 6000);
  }

  loadGoogleMaps();
})();
