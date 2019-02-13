'use strict';

// A little abstraction used to turn a NodeList into an array. This is useful
// for older browsers where NodeLists don't have a forEach method.
var sliceCall = arr => [].slice.call(arr);

function getOriginFromHref (href) {
  const pathArray = href.split("/");

  return `${pathArray[0]}//${pathArray[2]}/`;
}

function buildLinkTag (origin) {
  let linkEl = document.createElement("link");
  linkEl.rel = "dns-prefetch";
  linkEl.href = origin;
  linkEl.crossOrigin = "anonymous";

  document.head.appendChild(linkEl);
}

function dnstradamus (userOptions) {
  // Default options merged with user supplied ones
  const options = {
    context: "body",
    include: (anchor, origin) => true,
    timeout: 4000,
    observeChanges: false,
    observeRoot: "body",
    bailIfSlow: false,
    ...userOptions
  };

  const selectorString = `${options.context} a[href^="http://"],a[href^="https://"]`;
  const saveData = "connection" in navigator ? navigator.connection.saveData : false;
  const effectiveType = "connection" in navigator ? navigator.connection.effectiveType : "4g";
  const bail = options.bailIfSlow === true && (saveData === true || /^(3|4)g$/i.test(effectiveType) === true);

  if (("IntersectionObserver" in window && "IntersectionObserverEntry" in window) && bail === false) {
    let resolvedOrigins = [];

    let intersectionListener = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting === true) {
          let anchor = entry.target;
          let anchorOrigin = getOriginFromHref(anchor.href);

          if (resolvedOrigins.indexOf(anchorOrigin) === -1 && anchorOrigin.indexOf(`${document.location.protocol}//${document.location.host}`) === -1 && options.include(anchor, anchorOrigin) === true) {
            if (options.timeout > 0 && "requestIdleCallback" in window) {
              requestIdleCallback(() => buildLinkTag(anchorOrigin), {
                timeout: options.timeout
              });
            } else {
              buildLinkTag(anchorOrigin);
            }

            resolvedOrigins.push(anchorOrigin);
          }

          observer.unobserve(anchor);
          anchors = anchors.filter(anchorElement => anchorElement !== anchor);
        }
      });
    });

    let anchors = sliceCall(document.querySelectorAll(selectorString));
    anchors.forEach(anchor => intersectionListener.observe(anchor));

    if ("MutationObserver" in window && options.observeChanges === true) {
      new MutationObserver(mutations => mutations.forEach(() => {
        sliceCall(document.querySelectorAll(selectorString)).forEach(anchor => {
          if (anchors.indexOf(anchor) === -1 && resolvedOrigins.indexOf(getOriginFromHref(anchor.href)) === -1) {
            anchors.push(anchor);
            intersectionListener.observe(anchor);
          }
        });
      })).observe(document.querySelector(options.observeRoot), {
        childList: true,
        subtree: true
      });
    }
  }
}

module.exports = dnstradamus;
