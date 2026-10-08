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

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || "");
  }

  /** Prefer native app on Android — avoid Instagram/TikTok/FB web interstitials. */
  function androidIntent({ hostAndPath, packageName, scheme = "https", fallback }) {
    const path = String(hostAndPath || "").replace(/^https?:\/\//i, "");
    const parts = [
      `intent://${path}#Intent`,
      `scheme=${scheme}`,
      `package=${packageName}`,
    ];
    if (fallback) {
      parts.push(`S.browser_fallback_url=${encodeURIComponent(fallback)}`);
    }
    parts.push("end");
    return parts.join(";");
  }

  /**
   * Try app schemes in order; only fall back to https if the page stays visible
   * (app did not take over). TikTok works with a single https-intent; IG/FB need
   * custom schemes (instagram:// / fb://) or they land on the web interstitial.
   */
  function openAppSchemes(schemes, fallbackHttps) {
    let index = 0;
    const tryOne = () => {
      if (index >= schemes.length) {
        location.href = fallbackHttps;
        return;
      }
      const url = schemes[index++];
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("pagehide", onHide);
        clearTimeout(timer);
      };
      const onVis = () => {
        if (document.visibilityState === "hidden") done();
      };
      const onHide = () => done();
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("pagehide", onHide);
      const timer = setTimeout(() => {
        if (document.visibilityState === "hidden") {
          done();
          return;
        }
        done();
        tryOne();
      }, 700);
      location.href = url;
    };
    tryOne();
  }

  function socialLaunch(key, httpsUrl) {
    if (!httpsUrl) return { href: httpsUrl, native: false, schemes: null };

    if (!isAndroid()) {
      return { href: httpsUrl, native: false, schemes: null };
    }

    try {
      const u = new URL(httpsUrl);

      if (key === "instagram") {
        const user = (u.pathname.split("/").filter(Boolean)[0] || "").replace(/^@/, "");
        if (!user) return { href: httpsUrl, native: false, schemes: null };
        const schemes = [
          // Custom scheme first — forces the app (https-intent often stays in browser)
          `instagram://user?username=${encodeURIComponent(user)}`,
          androidIntent({
            hostAndPath: `user?username=${encodeURIComponent(user)}`,
            packageName: "com.instagram.android",
            scheme: "instagram",
            fallback: null,
          }),
          androidIntent({
            hostAndPath: `www.instagram.com/${user}/`,
            packageName: "com.instagram.android",
            scheme: "https",
            fallback: null,
          }),
        ];
        return { href: httpsUrl, native: true, schemes };
      }

      if (key === "tiktok") {
        const user = (u.pathname.match(/@([^/]+)/) || [])[1] || "";
        const path = user ? `www.tiktok.com/@${user}` : u.host + u.pathname;
        return {
          href: androidIntent({
            hostAndPath: path,
            packageName: "com.zhiliaoapp.musically",
            fallback: httpsUrl,
          }),
          native: true,
          schemes: null,
        };
      }

      if (key === "facebook") {
        const id = u.searchParams.get("id");
        const schemes = [];
        if (id) {
          // Page vs profile varies — try both, then https→FB package (TikTok-style)
          schemes.push(`fb://page/${id}`);
          schemes.push(`fb://profile/${id}`);
          schemes.push(
            androidIntent({
              hostAndPath: `page/${id}`,
              packageName: "com.facebook.katana",
              scheme: "fb",
              fallback: null,
            })
          );
          schemes.push(
            androidIntent({
              hostAndPath: `profile/${id}`,
              packageName: "com.facebook.katana",
              scheme: "fb",
              fallback: null,
            })
          );
          schemes.push(
            androidIntent({
              hostAndPath: `www.facebook.com/profile.php?id=${id}`,
              packageName: "com.facebook.katana",
              scheme: "https",
              fallback: null,
            })
          );
          schemes.push(
            androidIntent({
              hostAndPath: `www.facebook.com/profile.php?id=${id}`,
              packageName: "com.facebook.lite",
              scheme: "https",
              fallback: null,
            })
          );
        } else {
          const slug = u.pathname.replace(/^\//, "").split("/")[0];
          if (slug) {
            schemes.push(`fb://page/${slug}`);
            schemes.push(
              androidIntent({
                hostAndPath: `www.facebook.com/${slug}`,
                packageName: "com.facebook.katana",
                scheme: "https",
                fallback: null,
              })
            );
          }
        }
        if (schemes.length) {
          return { href: httpsUrl, native: true, schemes };
        }
      }

      if (key === "youtube") {
        return {
          href: androidIntent({
            hostAndPath: u.host + u.pathname + u.search,
            packageName: "com.google.android.youtube",
            fallback: httpsUrl,
          }),
          native: true,
          schemes: null,
        };
      }

      if (key === "play") {
        const id = u.searchParams.get("id");
        if (id) {
          return {
            href: `market://details?id=${encodeURIComponent(id)}`,
            native: true,
            schemes: null,
          };
        }
        const path = u.pathname + u.search;
        return {
          href: androidIntent({
            hostAndPath: `play.google.com${path}`,
            packageName: "com.android.vending",
            fallback: httpsUrl,
          }),
          native: true,
          schemes: null,
        };
      }
    } catch (_) {
      /* keep https */
    }

    return { href: httpsUrl, native: false, schemes: null };
  }

  function fillSocial(data) {
    if (!els.social) return;
    const website = data.websiteUrl || "https://www.mrericsson.com";
    const social = data.social || {};
    const bust = "v=9";
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
          const open = socialLaunch(item.key, item.url);
          const a = document.createElement("a");
          a.className = `social-btn social-btn--${item.key}`;
          a.href = open.href;
          // target=_blank breaks Android intent:// → keeps you in the bad web interstitial
          if (!open.native) {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
          }
          if (open.schemes && open.schemes.length) {
            a.addEventListener("click", (e) => {
              e.preventDefault();
              openAppSchemes(open.schemes, item.url);
            });
          }
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
        meta.className = "tester-meta";
        const title = document.createElement("strong");
        title.className = "tester-title";
        title.textContent = g.title || id;
        meta.appendChild(title);
        li.appendChild(meta);
        if (testerUrl) {
          const a = document.createElement("a");
          a.className = "tester-cta";
          a.href = testerUrl;
          a.textContent = "Bli testare";
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

  function goBack() {
    // Host app WebView can expose this later (PC-CATALOG-01)
    if (typeof window.AndroidCatalog?.goBack === "function") {
      window.AndroidCatalog.goBack();
      return;
    }
    if (history.length > 1) {
      history.back();
      return;
    }
    // Opened as first page — nothing to pop; stay put
  }

  document.getElementById("back-btn")?.addEventListener("click", goBack);
  els.retry?.addEventListener("click", load);
  load();
})();
