
// =========================
// ===== PWA INSTALL =======
// =========================
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}

let deferredPrompt = null;
const installBtn = document.getElementById("install-btn");

// Hide button if already installed or running as PWA
function checkInstallState() {
    // Check if running in standalone mode (already installed as PWA)
    if (window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://")) {
        installBtn.style.display = "none";
    }
}

// Check on page load
checkInstallState();

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = "";
});

installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    installBtn.style.display = "none";
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
    installBtn.style.display = "none";
    deferredPrompt = null;
});

/**
 * Fetches song data for the given songName and populates UI elements inside the specified divID.
 * 
 * @param {string} songName - The name of the song to search for.
 * @param {string} divID - The ID of the container div where the song info should be placed.
 */
function fetchAndDisplaySong(songName, divID) {
    const searchQuery =
        "https://itunes.apple.com/search?term=" + encodeURIComponent(songName);

    let searchResult;

    fetch(searchQuery)
        .then((response) => response.json())
        .then((json) => {
            if (json && Array.isArray(json.results)) {
                json.results = json.results.filter((item) => item.kind === "song");
            }

            searchResult = json;
            console.log(searchResult);

            if (searchResult.results && searchResult.results.length > 0) {
                const first = searchResult.results[0];
                // const artworkUrl = first.artworkUrl100.replace("100x100", "5000x5000");
                const cardDiv = document.getElementById(divID);
                if (!cardDiv) {
                    console.warn("No such div ID:", divID);
                    return;
                }

                // Set .card > img (first img in this container)
                const mainImg = cardDiv.querySelector("img");
                if (mainImg) {
                    mainImg.src = first.artworkUrl100.replace("100x100", "5000x5000");
                    mainImg.alt = first.trackName + " by " + first.artistName;
                }

                // Title and artist in this card only
                const titleElem = cardDiv.querySelector(".title");
                const artistElem = cardDiv.querySelector(".artist");
                if (titleElem) {
                    titleElem.textContent = first.trackName;
                    applyTitleMarqueeIfNeeded(titleElem);
                }
                if (artistElem) {
                    artistElem.textContent = first.artistName;
                }

                // Explicit marker in this card
                const explicitDiv = cardDiv.querySelector(".explicitcy");
                if (explicitDiv) {
                    // Remove any previous explicit marker
                    explicitDiv.querySelectorAll(".explicit-marker").forEach(el => el.remove());
                    if (first.trackExplicitness && first.trackExplicitness === "explicit") {
                        const boldE = document.createElement("b");
                        boldE.className = "explicit-marker";
                        boldE.textContent = "E";
                        explicitDiv.insertBefore(boldE, explicitDiv.firstChild);
                    }
                }

                // Details update (genre/release info) in this card
                const detailsElem = cardDiv.querySelector(".details");
                if (detailsElem) {
                    let genre = first.primaryGenreName || "";
                    let releaseDateStr = "";
                    if (first.releaseDate) {
                        const dateObj = new Date(first.releaseDate);
                        const month = dateObj.toLocaleString("en-US", { month: "long" });
                        const day = dateObj.getDate();
                        const year = dateObj.getFullYear();
                        releaseDateStr = `${month} ${day}, ${year}`;
                    }
                    detailsElem.innerHTML = `
                        Genre: ${genre}<br>
                        Release: ${releaseDateStr}
                    `;
                }
            } else {
                console.warn("No song results found.");
            }
        })
        .catch((error) => {
            console.error("Error fetching data:", error);
        });
}

import { requestSong, song } from "./backend.js";

fetchAndDisplaySong(requestSong(), "next");
fetchAndDisplaySong(requestSong(), "main");

/**
 * If the title overflows its container, apply a marquee scrolling effect.
 */
function applyTitleMarqueeIfNeeded(titleElement) {
    // Ensure layout is computed before measuring
    requestAnimationFrame(() => {
        const needsScroll = titleElement.scrollWidth > titleElement.clientWidth + 2;
        if (!needsScroll) return;

        const titleText = titleElement.textContent || "";

        // Build marquee structure
        const wrapper = document.createElement("div");
        wrapper.className = "marquee";
        const inner = document.createElement("div");
        inner.className = "marquee__inner";

        const span1 = document.createElement("span");
        span1.textContent = titleText;
        const span2 = document.createElement("span");
        span2.textContent = titleText;
        span2.setAttribute("aria-hidden", "true");

        inner.appendChild(span1);
        inner.appendChild(span2);
        wrapper.appendChild(inner);

        // Replace original content
        titleElement.textContent = "";
        titleElement.appendChild(wrapper);

        // Adjust animation speed relative to text length for readability
        const baseDurationSeconds = 9;
        const lengthFactor = Math.min(Math.max(titleText.length / 20, 0.7), 2.5);
        inner.style.animationDuration = `${baseDurationSeconds * lengthFactor}s`;

        // Compute exact scroll distance (width of one copy + gap)
        const computeAndSetDistance = () => {
            const styles = getComputedStyle(inner);
            const gapPx = parseFloat(styles.columnGap || styles.gap || "0") || 0;
            const distance = Math.ceil(span1.offsetWidth + gapPx);
            inner.style.setProperty("--marquee-distance", `${distance}px`);

            // Restart animation to avoid visual jumps on dimension change
            const currentAnimation = inner.style.animation;
            inner.style.animation = "none";
            // Force reflow
            // eslint-disable-next-line no-unused-expressions
            inner.offsetHeight;
            inner.style.animation = currentAnimation || "";
        };

        computeAndSetDistance();

        // Recompute on resize/orientation changes
        const onResize = () => computeAndSetDistance();
        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", onResize);

        // Store cleanup on element for potential future use
        titleElement._cleanupMarquee = () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("orientationchange", onResize);
        };
    });
}


// iOS drag support for all range sliders

const diagramSliders = document.querySelectorAll('input[type="range"]');

function iosRangeTouchHandler(e) {
    // Only handle single touch
    if (e.touches.length > 1) return;

    const input = e.target;
    const rect = input.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];

    // Calculate position relative to slider
    let left = rect.left + window.scrollX;
    let width = rect.width;
    let percent = (touch.pageX - left) / width;
    percent = Math.min(Math.max(percent, 0), 1);

    const min = parseFloat(input.min || 0);
    const max = parseFloat(input.max || 100);
    const step = parseFloat(input.step || 1);

    // Map percent to value
    let rawValue = min + percent * (max - min);
    // Snap to nearest step
    let steppedValue = Math.round((rawValue - min) / step) * step + min;
    // Clamp
    steppedValue = Math.min(Math.max(steppedValue, min), max);

    input.value = steppedValue;
    // Fire input and change events manually for live updates
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // Prevent native oddities/cursor stealing
    e.preventDefault();
}

if (/iPhone|iPad|iPod/.test(navigator.platform)) {
    diagramSliders.forEach(slider => {
        slider.addEventListener("touchstart", iosRangeTouchHandler, { passive: false });
        slider.addEventListener("touchmove", iosRangeTouchHandler, { passive: false });
    });
}
