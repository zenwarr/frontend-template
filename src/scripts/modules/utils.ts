export function getRandomId(): string {
  let S4 = function() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return 'rid-' + (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

export function getId(elem: HTMLElement): string {
  let id = elem.getAttribute('id');
  if (id == null) {
    id = getRandomId();
    elem.setAttribute('id', id);
  }
  return id;
}

export function detectIE(): void {
  let ua = window.navigator.userAgent;
  if (ua.indexOf('MSIE') > 0 || ua.indexOf('Trident/') > 0) {
    document.documentElement.classList.add('ie');
  }
}
