import { pathnamesArrayAllowedForMobileVersion } from 'types/constants';

export function saveToLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key)!);
}

/**
 * Removes duplicates from an array of objects based on a key extractor.
 *
 * @param array - The array to remove duplicates from
 * @param keyExtractor - A string key path (e.g., 'id') or a function that extracts a unique key from each item.
 *                       If the function returns null, undefined, or empty string, the item is treated as unique.
 * @param itemTransformer - Optional function to transform items before adding to result.
 *                          Receives (item, extractedKey) and returns the transformed item.
 * @returns A new array with duplicates removed
 *
 **/
export function removeDuplicates<T = any>(
  array: T[],
  keyExtractor: string | ((item: T) => string | null | undefined),
  itemTransformer?: (item: T, key: string) => T
): T[] {
  // Handle edge cases
  if (!Array.isArray(array)) return [];
  if (array.length <= 1) return array;

  const seen = new Set<string>();
  const keyFn =
    typeof keyExtractor === 'string'
      ? (item: T) => {
          const value = (item as any)?.[keyExtractor];
          return value === null || value === undefined ? null : String(value);
        }
      : keyExtractor;

  return array.reduce((acc: T[], item: T) => {
    // Skip null/undefined items
    if (item === null || item === undefined) return acc;

    // Extract the key
    const extractedKey = keyFn(item);
    const key =
      extractedKey === null || extractedKey === undefined
        ? ''
        : String(extractedKey).trim();

    // If no key, treat as unique (keep it)
    // This matches the behavior of all three original functions
    if (!key) {
      // Apply transformer if provided (even with empty key), otherwise use original item
      const finalItem = itemTransformer ? itemTransformer(item, '') : item;
      acc.push(finalItem);
      return acc;
    }

    // Check if we've seen this key
    if (seen.has(key)) {
      return acc;
    }

    // Mark as seen and add to result
    seen.add(key);

    // Apply transformer if provided, otherwise use original item
    const finalItem = itemTransformer ? itemTransformer(item, key) : item;
    acc.push(finalItem);

    return acc;
  }, []);
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const month = date.toLocaleString('default', { month: 'short' });
  return `${day} ${month}`;
}

export function isExpiredDate(dateString) {
  const expirationDate = new Date(dateString);
  const currentDate = new Date();
  return currentDate > expirationDate;
}

export const checkMobileReminderVisibilityByPathname = (pathname: string) => {
  return !pathnamesArrayAllowedForMobileVersion.includes(pathname);
};

export const isBeforeCheckData = (createdAt: Date, checkDate: Date) => {
  return createdAt < checkDate;
};

export const convertToKey = (string) => {
  if (!string) return '';
  return string.replace(/\s/g, '').toLowerCase();
};

export const formatDateWithNewRule = (dateString: string = ''): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const currentYear = now.getFullYear();

  // Calculate the difference in days between the input date and the current date
  const dateWithoutTime = new Date(date.toDateString());
  const currentWithoutTime = new Date(now.toDateString());
  const timeDiff = dateWithoutTime.getTime() - currentWithoutTime.getTime();

  const HoursInDay = 24;
  const SecondsInMinute = 60;
  const MinutesInHour = 60;
  const MillisecondsInSecond = 1000;
  const dayDiff =
    timeDiff /
    (MillisecondsInSecond * SecondsInMinute * MinutesInHour * HoursInDay);

  if (dayDiff === 0) {
    return 'Today';
  } else if (dayDiff === -1) {
    return 'Yesterday';
  }

  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' }); // E.g., "Oct"

  if (date.getFullYear() === currentYear) {
    return `${day} ${month}`;
  } else {
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }
};

export const downloadSvg = (svg: string, documentTitle: string): void => {
  // Create a temporary container to parse the SVG string
  const svgElement = document.createElement('div');
  svgElement.innerHTML = svg;
  const svgNode = svgElement.firstChild as SVGElement | null;

  if (svgNode) {
    // Create a Blob from the SVG content
    const svgBlob = new Blob([svgNode.outerHTML], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create a temporary anchor element to trigger the download
    const tempLink = document.createElement('a');
    tempLink.href = svgUrl;
    tempLink.download = `Visual_summary_for_${documentTitle.replace(/ /g, '_')}.svg`;

    // Append the anchor to the document, trigger the click, and remove it
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);

    // Release the Blob URL
    URL.revokeObjectURL(svgUrl);
  }
};

export const getMatchesByRegex = (defaultValue: string, regex: RegExp) => {
  return defaultValue.match(regex);
};

//add a common function to add a dynamic class to style and remove it after use by the id
export const addDynamicClassToStyle = (
  id: string,
  cssRules: string
): HTMLStyleElement | null => {
  if (!id || !cssRules) {
    console.warn(
      'Invalid arguments for addDynamicClassToStyle: id and cssRules are required'
    );
    return null;
  }

  try {
    // Check if a style with this ID already exists and remove it
    removeDynamicClassFromStyle(id);

    // Create a new style element
    const styleElement = document.createElement('style');
    styleElement.id = id;
    styleElement.textContent = cssRules; // textContent is faster than innerHTML and safer for CSS

    // Append the style element to the document head
    document.head.appendChild(styleElement);
    return styleElement;
  } catch (error) {
    console.error('Failed to add dynamic style:', error);
    return null;
  }
};

export const removeDynamicClassFromStyle = (id: string): boolean => {
  if (!id) {
    console.warn(
      'Invalid argument for removeDynamicClassFromStyle: id is required'
    );
    return false;
  }

  try {
    // Find the style element by ID
    const styleElement = document.getElementById(id);

    // Remove it if it exists
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to remove dynamic style:', error);
    return false;
  }
};

// Native JavaScript implementations of lodash functions

/**
 * Creates an array of unique values from array, using iteratee to generate the unique key.
 * Similar to lodash uniqBy
 */
export function uniqBy<T>(
  array: T[],
  iteratee: string | ((item: T) => any)
): T[] {
  if (!Array.isArray(array)) return [];

  const seen = new Set();
  const keyFn =
    typeof iteratee === 'string'
      ? (item: T) => item[iteratee as keyof T]
      : iteratee;

  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds.
 * Similar to lodash debounce
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: any;
  let result: ReturnType<T>;
  let lastCallTime: number | undefined;

  const { leading = false, trailing = true } = options;

  function invokeFunc() {
    const args = lastArgs!;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    result = func.apply(thisArg, args);
    return result;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0
    );
  }

  function leadingEdge() {
    timeoutId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc() : result;
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeWaiting = wait - timeSinceLastCall;

    return timeWaiting;
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge();
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge() {
    timeoutId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc();
    }
    lastArgs = undefined;
    lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    lastArgs = undefined;
    lastCallTime = undefined;
    lastThis = undefined;
    timeoutId = undefined;
  }

  function debounced(this: any, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === undefined) {
        return leadingEdge();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(timerExpired, wait);
        return invokeFunc();
      }
    }
    if (timeoutId === undefined) {
      timeoutId = setTimeout(timerExpired, wait);
    }
    return result;
  }

  debounced.cancel = cancel;
  return debounced as T & { cancel: () => void };
}

/**
 * Performs a deep comparison between two values to determine if they are equivalent.
 * Similar to lodash isEqual
 */
export function isEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Creates a deep clone of value.
 * Similar to lodash cloneDeep
 */
export function cloneDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) return new Date(obj.getTime()) as T;

  if (obj instanceof Array) {
    return obj.map((item) => cloneDeep(item)) as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = cloneDeep(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}
