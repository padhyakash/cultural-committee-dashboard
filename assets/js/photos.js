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

/** @returns {{ youtubeUrl: string, title?: string, videoId: string }[]} */
function getEventVideos() {
  const fromList = (config.eventVideos || [])
    .filter((item) => item?.youtubeUrl)
    .map((item, index) => ({
      youtubeUrl: item.youtubeUrl,
      title: item.title || `Event video ${index + 1}`,
      videoId: youtubeVideoId(item.youtubeUrl),
    }))
    .filter((item) => item.videoId);

  if (fromList.length > 0) return fromList;

  const legacy = /** @type {{ youtubeUrl?: string, title?: string }} */ (
    config.eventVideo
  );
  if (legacy?.youtubeUrl) {
    const videoId = youtubeVideoId(legacy.youtubeUrl);
    if (videoId) {
      return [
        {
          youtubeUrl: legacy.youtubeUrl,
          title: legacy.title || "Event video",
          videoId,
        },
      ];
    }
  }

  return [];
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
  const videosSection = document.getElementById("photos-videos");
  const videosList = document.getElementById("photos-videos-list");

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

  const videos = getEventVideos();

  if (videos.length > 0 && videosSection && videosList) {
    videosSection.classList.remove("hidden");
    videosList.innerHTML = videos
      .map(
        (video, index) => `<article class="photos-video-item">
          <h4 class="photos-video-item-title">${escapeHtml(video.title)}</h4>
          <div class="photos-video-frame">
            <iframe
              class="photos-video-iframe"
              data-video-index="${index}"
              title="${escapeHtml(video.title)}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>
          </div>
          <p class="photos-video-link-wrap">
            <a href="${escapeHtml(video.youtubeUrl)}" target="_blank" rel="noopener noreferrer"
              >Watch on YouTube</a
            >
          </p>
        </article>`,
      )
      .join("");
  } else if (videosSection) {
    videosSection.classList.add("hidden");
  }

  function mountVideos() {
    if (!videosList) return;
    videosList.querySelectorAll(".photos-video-iframe").forEach((node) => {
      if (!(node instanceof HTMLIFrameElement)) return;
      const index = Number(node.dataset.videoIndex);
      const video = videos[index];
      if (video) {
        node.src = `https://www.youtube-nocookie.com/embed/${video.videoId}`;
      }
    });
  }

  function unmountVideos() {
    if (!videosList) return;
    videosList.querySelectorAll(".photos-video-iframe").forEach((node) => {
      if (node instanceof HTMLIFrameElement) node.src = "";
    });
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
    if (videos.length > 0) mountVideos();
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  });

  closeBtn.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => unmountVideos());

  lightboxClose.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
}
