import { config } from "./config.js";

/** @param {string} text */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string} url */
function youtubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || "";
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }
  return "";
}

/** @param {string} path */
function resolveAssetUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/^\//, "");
  if (window.location.protocol !== "file:") {
    return `${window.location.origin}/${clean}`;
  }
  const base = window.location.href.replace(/\/[^/]*$/, "/");
  return `${base}${clean}`;
}

export function initPhotosGallery() {
  const openBtn = document.getElementById("photos-btn");
  const dialog = /** @type {HTMLDialogElement | null} */ (
    document.getElementById("photos-dialog")
  );
  const grid = document.getElementById("photos-grid");
  const closeBtn = document.getElementById("photos-close");
  const lightbox = /** @type {HTMLDialogElement | null} */ (
    document.getElementById("photos-lightbox")
  );
  const lightboxImg = /** @type {HTMLImageElement | null} */ (
    document.getElementById("photos-lightbox-img")
  );
  const lightboxCaption = document.getElementById("photos-lightbox-caption");
  const lightboxClose = document.getElementById("photos-lightbox-close");
  const videoSection = document.getElementById("photos-video");
  const videoTitle = document.getElementById("photos-video-title");
  const videoIframe = /** @type {HTMLIFrameElement | null} */ (
    document.getElementById("photos-video-iframe")
  );
  const videoLink = /** @type {HTMLAnchorElement | null} */ (
    document.getElementById("photos-video-link")
  );

  if (
    !openBtn ||
    !dialog ||
    !grid ||
    !closeBtn ||
    !lightbox ||
    !lightboxImg ||
    !lightboxCaption ||
    !lightboxClose
  ) {
    return;
  }

  const videoConfig = config.eventVideo;
  const videoId = videoConfig?.youtubeUrl ? youtubeVideoId(videoConfig.youtubeUrl) : "";

  function mountVideo() {
    if (!videoIframe || !videoId) return;
    videoIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
  }

  function unmountVideo() {
    if (videoIframe) videoIframe.src = "";
  }

  if (videoId && videoSection && videoLink) {
    videoSection.classList.remove("hidden");
    const title = videoConfig.title || "Event video";
    if (videoTitle) videoTitle.textContent = title;
    if (videoIframe) videoIframe.title = title;
    videoLink.href = videoConfig.youtubeUrl;
  } else if (videoSection) {
    videoSection.classList.add("hidden");
  }

  const photos = config.galleryPhotos.filter((item) => item?.src);

  grid.innerHTML =
    photos.length === 0
      ? `<p class="photos-empty">Photos will be added here soon.</p>`
      : photos
          .map((photo, index) => {
            const src = resolveAssetUrl(photo.src);
            const alt = escapeHtml(photo.alt || `Event photo ${index + 1}`);
            const caption = photo.caption ? escapeHtml(photo.caption) : "";
            return `<button type="button" class="photos-thumb" data-index="${index}">
              <img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" />
              ${caption ? `<span class="photos-thumb-caption">${caption}</span>` : ""}
            </button>`;
          })
          .join("");

  /** @param {number} index */
  function openLightbox(index) {
    const photo = photos[index];
    if (!photo) return;
    lightboxImg.src = resolveAssetUrl(photo.src);
    lightboxImg.alt = photo.alt || "";
    lightboxCaption.textContent = photo.caption || photo.alt || "";
    if (typeof lightbox.showModal === "function") {
      lightbox.showModal();
    }
  }

  grid.addEventListener("click", (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const thumb = target.closest(".photos-thumb");
    if (!thumb || !(thumb instanceof HTMLElement)) return;
    const index = Number(thumb.dataset.index);
    if (!Number.isNaN(index)) openLightbox(index);
  });

  openBtn.addEventListener("click", () => {
    if (videoId) mountVideo();
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  });

  closeBtn.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => unmountVideo());

  lightboxClose.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
}
