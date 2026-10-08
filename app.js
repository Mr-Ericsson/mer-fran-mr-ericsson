(() => {
  const params = new URLSearchParams(location.search);
  const hide = (params.get("hide") || "").trim();
  const page = document.body.dataset.page || "home";

  const els = {
    brandTitle: document.getElementById("brand-title"),
    brandSub: document.getElementById("brand-sub"),
    liveSection: document.getElementById("live-section"),
    liveGrid: document.getElementById("live-grid"),
    testingSection: document.getElementById("testing-section"),
    testingGrid: document.getElementById("testing-grid"),
    upcomingSection: document.getElementById("upcoming-section"),
    upcomingGrid: document.getElementById("upcoming-grid"),
    empty: document.getElementById("empty"),
    error: document.getElementById("error"),
    retry: document.getElementById("retry"),
    websiteLink: document.getElementById("website-link"),
    social: document.getElementById("social"),
    testerList: document.getElementById("tester-list"),
    testerNote: document.getElementById("tester-note"),
  };

  function playUrlFor(game) {
    if (game.playUrl) return game.playUrl;
    if (game.packageName) {
      return `https://play.google.com/store/apps/details?id=${encodeURIComponent(game.packageName)}`;
    }
    return null;
  }

  function initials(title) {
    return (title || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase();
  }

  function iconNode(game) {
    const wrap = document.createElement("div");
    wrap.className = "tile-icon-wrap";
    if (game.iconUrl) {
      const img = document.createElement("img");
      img.className = "tile-icon";
      img.src = game.iconUrl;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => {
        wrap.replaceChildren(fallbackIcon(game.title));
      });
      wrap.appendChild(img);
    } else {
      wrap.appendChild(fallbackIcon(game.title));
    }
    return wrap;
  }

  function fallbackIcon(title) {
    const div = document.createElement("div");
    div.className = "tile-icon tile-icon--fallback";
    div.textContent = initials(title);
    div.setAttribute("aria-hidden", "true");
    return div;
  }

  function tile(game, { href, badge } = {}) {
    const a = document.createElement(href ? "a" : "div");
    a.className = "tile";
    if (href) {
      a.href = href;
      a.rel = "noopener noreferrer";
    }
    a.appendChild(iconNode(game));
    const title = document.createElement("h3");
    title.className = "tile-title";
    title.textContent = game.title || "Spel";
    a.appendChild(title);
    if (badge) {
      const b = document.createElement("span");
      b.className = "tile-badge";
      b.textContent = badge;
      a.appendChild(b);
    }
    return a;
  }

  function wrapLi(node) {
    const li = document.createElement("li");
    li.appendChild(node);
    return li;
  }

  function fillSocial(data) {
    if (!els.social) return;
    const website = data.websiteUrl || "https://www.mrericsson.com";
    const social = data.social || {};
    const bust = "v=7";
    const items = [
      { key: "website", label: "Hemsida", url: website, icon: `assets/social/website.svg?${bust}` },
      { key: "play", label: "Google Play", url: data.playDeveloperUrl || "", icon: `assets/social/play.svg?${bust}` },
      { key: "tiktok", label: "TikTok", url: social.tiktok || "", icon: `assets/social/tiktok.svg?${bust}` },
      { key: "instagram", label: "Instagram", url: social.instagram || "", icon: `assets/social/instagram.svg?${bust}` },
      { key: "facebook", label: "Facebook", url: social.facebook || "", icon: `assets/social/facebook.svg?${bust}` },
      { key: "youtube", label: "YouTube", url: social.youtube || "", icon: `assets/social/youtube.svg?${bust}` },
    ];
    els.social.replaceChildren(
      ...items
        .filter((item) => item.url)
        .map((item) => {
          const a = document.createElement("a");
          a.className = `social-btn social-btn--${item.key}`;
          a.href = item.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.title = item.label;
          a.setAttribute("aria-label", item.label);
          const img = document.createElement("img");
          img.src = item.icon;
          img.alt = "";
          img.width = 32;
          img.height = 32;
          img.decoding = "async";
          const span = document.createElement("span");
          span.textContent = item.label;
          a.append(img, span);
          return a;
        })
    );
    if (els.websiteLink) {
      els.websiteLink.href = website;
      els.websiteLink.textContent = "www.mrericsson.com";
    }
  }

  function byId(data) {
    const map = new Map();
    for (const g of [...(data.live || []), ...(data.testing || []), ...(data.upcoming || [])]) {
      map.set(g.id, g);
    }
    return map;
  }

  function renderHome(data) {
    const brand = data.brand || {};
    if (brand.title && els.brandTitle) els.brandTitle.textContent = brand.title;
    if (brand.subtitle && els.brandSub) els.brandSub.textContent = brand.subtitle;

    const live = (data.live || []).filter((g) => !hide || g.packageName !== hide);
    const testing = (data.testing || []).filter((g) => !hide || g.packageName !== hide);
    const upcoming = data.upcoming || [];
    const website = data.websiteUrl || "https://www.mrericsson.com";

    if (els.liveGrid) {
      els.liveGrid.replaceChildren(
        ...live.map((g) => wrapLi(tile(g, { href: playUrlFor(g) })))
      );
    }
    function websiteHref(game) {
      if (game.websiteUrl) return game.websiteUrl;
      const path = game.websitePath || "/";
      if (path.startsWith("http")) return path;
      return `${website.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
    }

    if (els.testingGrid) {
      els.testingGrid.replaceChildren(
        ...testing.map((g) =>
          wrapLi(tile(g, { href: websiteHref(g), badge: "Test" }))
        )
      );
    }
    if (els.upcomingGrid) {
      els.upcomingGrid.replaceChildren(
        ...upcoming.map((g) =>
          wrapLi(tile(g, { badge: "Snart" }))
        )
      );
    }

    els.liveSection?.classList.toggle("hidden", live.length === 0);
    els.testingSection?.classList.toggle("hidden", testing.length === 0);
    els.upcomingSection?.classList.toggle("hidden", upcoming.length === 0);

    if (els.empty) {
      els.empty.classList.toggle(
        "hidden",
        !(live.length === 0 && testing.length === 0 && upcoming.length === 0)
      );
    }

    fillSocial(data);
  }

  function renderTesters(data) {
    fillSocial(data);
    const map = byId(data);
    const entries = (data.testers && data.testers.installNow) || [];
    if (els.testerNote && data.testers?.note) {
      els.testerNote.textContent = data.testers.note;
    }
    if (!els.testerList) return;
    els.testerList.replaceChildren(
      ...entries.map((entry) => {
        const id = typeof entry === "string" ? entry : entry.id;
        const testerUrl =
          typeof entry === "string"
            ? `https://play.google.com/apps/testing/${map.get(id)?.packageName || id}`
            : entry.testerUrl;
        const g = map.get(id) || { id, title: id };
        const li = document.createElement("li");
        li.className = "tester-row";
        li.appendChild(iconNode(g));
        const meta = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = g.title || id;
        meta.appendChild(title);
        if (g.packageName) {
          const pkg = document.createElement("div");
          pkg.className = "prose";
          pkg.style.fontSize = "0.75rem";
          pkg.style.margin = "2px 0 0";
          pkg.textContent = g.packageName;
          meta.appendChild(pkg);
        }
        li.appendChild(meta);
        if (testerUrl) {
          const a = document.createElement("a");
          a.href = testerUrl;
          a.textContent = "Become a tester";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          li.appendChild(a);
        }
        return li;
      })
    );
  }

  async function load() {
    try {
      const res = await fetch(`games.json?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      els.error?.classList.add("hidden");
      if (page === "testers") renderTesters(data);
      else if (page === "about") fillSocial(data);
      else renderHome(data);
    } catch (err) {
      console.error(err);
      els.liveSection?.classList.add("hidden");
      els.testingSection?.classList.add("hidden");
      els.upcomingSection?.classList.add("hidden");
      els.empty?.classList.add("hidden");
      els.error?.classList.remove("hidden");
    }
  }

  els.retry?.addEventListener("click", load);
  load();
})();
