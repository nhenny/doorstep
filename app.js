(function () {
  "use strict";

  var CONFIG = window.DOORSTEP_CONFIG || {};

  // ---------------------------------------------------------------------
  // Example data. Structure is real (walk list -> area list -> houses);
  // the names and counts are placeholders until this reads from a backend.
  // ---------------------------------------------------------------------
  var DATA = [
    { id: "wl1", name: "Example Walk List 1", areas: [
      { id: "a1", name: "Example Area 1", total: 18, done: 6 },
      { id: "a2", name: "Example Area 2", total: 24, done: 0 },
      { id: "a3", name: "Example Area 3", total: 12, done: 12 }
    ]},
    { id: "wl2", name: "Example Walk List 2", areas: [
      { id: "a4", name: "Example Area 4", total: 30, done: 10 },
      { id: "a5", name: "Example Area 5", total: 15, done: 3 }
    ]},
    { id: "wl3", name: "Example Walk List 3", areas: [
      { id: "a6", name: "Example Area 6", total: 20, done: 0 },
      { id: "a7", name: "Example Area 7", total: 22, done: 22 }
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
    heading.textContent = "Walk lists";
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

      var btn = document.createElement("button");
      btn.className = "walklist-btn";
      btn.setAttribute("aria-expanded", "false");
      btn.id = "btn-" + wl.id;
      btn.innerHTML =
        '<span class="wl-name">' + wl.name + '</span>' +
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

      wrap.appendChild(btn);
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
        showMapBanner('Couldn’t find "' + query + '" — try a more specific address or city.');
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

  function cleanOcrLines(text) {
    return text
      .split("\n")
      .map(function (l) { return l.replace(/[|_~]+/g, " ").replace(/\s+/g, " ").trim(); })
      .filter(function (l) {
        // Keep lines that look address-like: has a digit and a real word in it.
        return l.length >= 5 && /\d/.test(l) && /[A-Za-z]{2,}/.test(l);
      });
  }

  stopsUploadBtn.addEventListener("click", function () {
    stopsImageInput.click();
  });

  stopsImageInput.addEventListener("change", function () {
    var file = stopsImageInput.files && stopsImageInput.files[0];
    stopsImageInput.value = ""; // allow re-selecting the same file again later
    if (!file) return;

    setStopsBusy(true);
    setStopsStatus("Reading the screenshot…");

    loadTesseract()
      .then(function () { return Tesseract.recognize(file, "eng"); })
      .then(function (result) {
        var text = result && result.data && result.data.text ? result.data.text : "";
        var lines = cleanOcrLines(text);
        if (!lines.length) {
          setStopsStatus("Couldn't make out any addresses in that image — try a clearer screenshot, or paste the addresses instead.", true);
          return;
        }
        var existing = stopsInput.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
        stopsInput.value = existing.concat(lines).join("\n");
        setStopsStatus("Pulled " + lines.length + " line" + (lines.length === 1 ? "" : "s") + " from the image — double-check them below, then build the route.");
      })
      .catch(function (err) {
        setStopsStatus(err && err.message ? err.message : "Couldn't read that image.", true);
      })
      .then(function () { setStopsBusy(false); });
  });

  function geocodeAll(addresses, callback) {
    if (!geocoder) geocoder = new google.maps.Geocoder();
    var results = [];
    var failed = [];
    var i = 0;
    function next() {
      if (i >= addresses.length) {
        if (!results.length) { callback("Couldn't find any of those addresses. Try including city and state."); return; }
        callback(null, results, failed);
        return;
      }
      var addr = addresses[i++];
      geocoder.geocode({ address: addr }, function (res, status) {
        if (status === "OK" && res && res[0]) {
          results.push({ address: addr, lat: res[0].geometry.location.lat(), lng: res[0].geometry.location.lng() });
        } else {
          failed.push(addr);
        }
        window.setTimeout(next, 180); // stay well under Geocoding's per-second rate limit
      });
    }
    next();
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
          return { address: o.address, lat: o.lat, lng: o.lng, status: "upcoming", order: i };
        });
        saveStopsForArea(area.id, stops);
        var areaBtnEl = document.getElementById("area-" + area.id);
        if (areaBtnEl) {
          document.querySelectorAll(".area-btn.selected").forEach(function (b) { b.classList.remove("selected"); });
          areaBtnEl.classList.add("selected");
        }
        closeStopsModal();
        activateArea(area);
        refreshAreaMeta();
        selectTab("map"); // make sure the built route is actually visible
        if (failed && failed.length) {
          showMapBanner("Route built, but couldn't find: " + failed.join(", "));
        }
      });
    });
  }

  // ---- Stop markers + route line on the map ----
  var STATUS_CYCLE = ["upcoming", "done", "notyet", "refused"];
  var stopMarkers = [];
  var stopPolyline = null;

  function clearStopMarkers() {
    stopMarkers.forEach(function (m) { m.setMap(null); });
    stopMarkers = [];
    if (stopPolyline) { stopPolyline.setMap(null); stopPolyline = null; }
  }

  function showStopsForArea(area) {
    clearStopMarkers();
    if (!window.__doorstepMap) return;
    var stops = loadStopsForArea(area.id);
    if (stops && stops.length) renderStopsOnMap(area, stops);
  }

  function stopIcon(status) {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: STATUS_COLOR[status] || STATUS_COLOR.upcoming,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2
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
        label: { text: String(i + 1), color: "#ffffff", fontSize: "11px", fontWeight: "700" },
        icon: stopIcon(stop.status),
        title: stop.address,
        zIndex: 500
      });
      marker.addListener("click", function () {
        var idx = STATUS_CYCLE.indexOf(stop.status);
        stop.status = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
        marker.setIcon(stopIcon(stop.status));
        saveStopsForArea(area.id, stops);
        if (currentAreaId === area.id) {
          var counts = getAreaCounts(area);
          statValue.textContent = (counts.total - counts.done) + " of " + counts.total + " stops left";
        }
        refreshAreaMeta();
      });
      stopMarkers.push(marker);
    });
    stopPolyline = new google.maps.Polyline({
      path: path,
      map: window.__doorstepMap,
      strokeColor: "#2fd6c3",
      strokeOpacity: 0.85,
      strokeWeight: 3
    });
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

  function onPosition(pos) {
    var latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    ensureYouMarker(latLng);
    if (window.__doorstepMap) {
      window.__doorstepMap.panTo(latLng);
    }
  }

  function onPositionError() {
    showMapBanner("Couldn't get your location — check location permissions.");
    stopTracking();
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
      showMapBanner("Location isn't available in this browser.");
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

      mapFallback.hidden = true;
      mapBanner.hidden = true;

      setupSearch();

      if (currentAreaId) {
        var activeArea = findAreaById(currentAreaId);
        if (activeArea) showStopsForArea(activeArea);
      }
    } catch (err) {
      showMapBanner("Map failed to load — check the API key and its referrer restrictions in config.js.");
    }
  };

  function showMapBanner(text) {
    mapBannerText.textContent = text;
    mapBanner.hidden = false;
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
