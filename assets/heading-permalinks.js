(function () {
  "use strict";

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function uniqueId(baseId, heading) {
    var base = baseId || "section";
    var candidate = base;
    var suffix = 2;
    var existing = document.getElementById(candidate);

    while (existing && existing !== heading) {
      candidate = base + "-" + suffix;
      suffix += 1;
      existing = document.getElementById(candidate);
    }

    return candidate;
  }

  function addHeadingPermalinks() {
    var root = document.querySelector(".page-content .wrapper");
    if (!root) return;

    var headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
    for (var i = 0; i < headings.length; i += 1) {
      var heading = headings[i];
      if (heading.querySelector(".heading-anchor")) continue;

      heading.id = uniqueId(heading.id || slugify(heading.textContent), heading);

      var anchor = document.createElement("a");
      anchor.className = "heading-anchor";
      anchor.href = "#" + heading.id;
      anchor.setAttribute("aria-label", "Permalink to " + heading.textContent.trim());
      anchor.textContent = "#";
      heading.appendChild(anchor);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addHeadingPermalinks);
  } else {
    addHeadingPermalinks();
  }
})();
