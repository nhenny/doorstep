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

  // Example pin positions as percentages of the map viewport (used for the
  // offline fallback preview) and converted to lat/lng around MAP_CENTER
  // (used for the live Google Map).
  var PINS = [
    [8,10,"done"],[15,13,"done"],[24,9,"notyet"],[41,11,"upcoming"],[58,8,"done"],
    [72,12,"refused"],[89,15,"upcoming"],[10,29,"notyet"],[22,33,"done"],[38,27,"upcoming"],
    [54,31,"done"],[63,25,"refused"],[78,29,"upcoming"],[92,33,"notyet"],[6,50,"upcoming"],
    [20,46,"done"],[33,52,"notyet"],[47,48,"upcoming"],[60,54,"done"],[74,50,"upcoming"],
    [86,46,"done"],[13,68,"upcoming"],[28,72,"notyet"],[44,66,"upcoming"],[57,70,"done"],
    [70,74,"upcoming"],[83,68,"refused"],[18,90,"upcoming"],[45,88,"notyet"],[70,90,"done"]
  ];

  var STATUS_COLOR = {
    done: "#1e8e5a",
    notyet: "#c07f2f",
    refused: "#b0443c",
    upcoming: "#8791a0"
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

  function statusDotColor(area) {
    if (area.done === 0) return "var(--status-upcoming)";
    if (area.done === area.total) return "var(--status-done)";
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

      var doneSum = wl.areas.reduce(function (s, a) { return s + a.done; }, 0);
      var totalSum = wl.areas.reduce(function (s, a) { return s + a.total; }, 0);

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
        var aBtn = document.createElement("button");
        aBtn.className = "area-btn";
        aBtn.id = "area-" + area.id;
        aBtn.innerHTML =
          '<span class="dot" style="background:' + statusDotColor(area) + '"></span>' +
          '<span class="a-name">' + area.name + '</span>' +
          '<span class="a-progress">' + area.done + '/' + area.total + '</span>';
        aBtn.addEventListener("click", function () {
          selectArea(area, aBtn);
        });
        areaWrap.appendChild(aBtn);
      });

      wrap.appendChild(btn);
      wrap.appendChild(areaWrap);
      panelInner.appendChild(wrap);
    });
  }

  function selectArea(area, aBtn) {
    document.querySelectorAll(".area-btn.selected").forEach(function (b) {
      b.classList.remove("selected");
    });
    aBtn.classList.add("selected");
    triggerValue.textContent = area.name;
    statValue.textContent = area.done + " of " + area.total + " stops";
    closePanel();
    try { localStorage.setItem("doorstep.selectedArea", area.id); } catch (e) {}
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
      outer:
      for (var i = 0; i < DATA.length; i++) {
        for (var j = 0; j < DATA[i].areas.length; j++) {
          if (DATA[i].areas[j].id === saved) {
            var el = document.getElementById("area-" + saved);
            if (el) selectArea(DATA[i].areas[j], el);
            break outer;
          }
        }
      }
    }
  } catch (e) {}

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

  var fallbackPinsEl = document.getElementById("fallbackPins");
  PINS.forEach(function (p) {
    var pin = document.createElement("div");
    pin.className = "pin " + p[2];
    pin.style.left = p[0] + "%";
    pin.style.top = p[1] + "%";
    fallbackPinsEl.appendChild(pin);
  });

  document.getElementById("fabLocate").addEventListener("click", function () {
    if (window.__doorstepMap && window.__doorstepMarkers) {
      window.__doorstepMap.panTo(CONFIG.MAP_CENTER);
      window.__doorstepMap.setZoom(CONFIG.MAP_ZOOM || 15);
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

  function pctToLatLng(xPct, yPct) {
    var center = CONFIG.MAP_CENTER || { lat: 42.5006, lng: -90.6648 };
    var latSpread = 0.018;
    var lngSpread = 0.03;
    return {
      lat: center.lat + ((50 - yPct) / 100) * latSpread,
      lng: center.lng + ((xPct - 50) / 100) * lngSpread
    };
  }

  window.initDoorstepMap = function initDoorstepMap() {
    try {
      var map = new google.maps.Map(document.getElementById("map"), {
        center: CONFIG.MAP_CENTER,
        zoom: CONFIG.MAP_ZOOM || 15,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false
      });

      var markers = PINS.map(function (p) {
        var pos = pctToLatLng(p[0], p[1]);
        return new google.maps.Marker({
          position: pos,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: STATUS_COLOR[p[2]],
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2
          }
        });
      });

      new google.maps.Marker({
        position: CONFIG.MAP_CENTER,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: "#0f6e64",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3
        },
        zIndex: 999
      });

      window.__doorstepMap = map;
      window.__doorstepMarkers = markers;

      mapFallback.hidden = true;
      mapBanner.hidden = true;
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
