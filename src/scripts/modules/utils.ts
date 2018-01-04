export function detectIE(): void {
  let ua = window.navigator.userAgent;
  if (ua.indexOf('MSIE') > 0 || ua.indexOf('Trident/') > 0) {
    document.documentElement.classList.add('ie');
  }
}
