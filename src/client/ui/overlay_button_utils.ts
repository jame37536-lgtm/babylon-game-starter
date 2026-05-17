// ============================================================================
// OVERLAY BUTTON UTILITIES (settings / inventory corner controls)
// ============================================================================

import { MOBILE_CONTROLS } from '../config/mobile_controls';
import { DeviceDetector } from '../utils/device_detector';

const DESKTOP_CORNER_INSET = 20;
const OVERLAY_BUTTON_SIZE = 50;
/** Bottom strip on mobile — HUD stays at the top; these sit low beside touch controls. */
const MOBILE_BOTTOM_INSET = 20;

export type OverlayCorner = 'bottom-left' | 'bottom-right';

export interface OverlayButtonStyleOptions {
  corner: OverlayCorner;
  zIndex: number;
}

export interface OverlayButtonLayout {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface OverlayToggleBinding {
  remove: () => void;
}

export interface OutsideCloseBinding {
  remove: () => void;
}

/**
 * True when on-screen mobile joystick / action buttons are in use.
 */
export function shouldUseMobileOverlayLayout(): boolean {
  return DeviceDetector.isMobileDevice() || document.getElementById('mobile-joystick') != null;
}

/**
 * Layout for settings / inventory — always bottom corners.
 * On mobile: stay on the bottom edge but shift inward beside joystick / jump+boost columns.
 */
export function getOverlayButtonLayout(corner: OverlayCorner): OverlayButtonLayout {
  const margin = DESKTOP_CORNER_INSET;

  if (shouldUseMobileOverlayLayout()) {
    const joystickWidth = MOBILE_CONTROLS.JOYSTICK_RADIUS * 2;
    const actionColumnWidth = MOBILE_CONTROLS.BUTTON_SIZE + margin;

    if (corner === 'bottom-left') {
      // Right of the joystick column, still on the bottom strip
      return {
        bottom: MOBILE_BOTTOM_INSET,
        left: joystickWidth + margin
      };
    }
    // Left of the jump/boost column, still on the bottom strip
    return {
      bottom: MOBILE_BOTTOM_INSET,
      right: actionColumnWidth + margin
    };
  }

  if (corner === 'bottom-left') {
    return { bottom: margin, left: margin };
  }
  return { bottom: margin, right: margin };
}

function layoutToCss(layout: OverlayButtonLayout): string {
  const parts: string[] = [];
  if (layout.top != null) {
    parts.push(`top: ${layout.top}px`);
  }
  if (layout.bottom != null) {
    parts.push(`bottom: ${layout.bottom}px`);
  }
  if (layout.left != null) {
    parts.push(`left: ${layout.left}px`);
  }
  if (layout.right != null) {
    parts.push(`right: ${layout.right}px`);
  }
  return parts.join('; ');
}

/**
 * Applies shared fixed overlay button styles for reliable touch targets.
 */
export function applyOverlayButtonBaseStyles(
  el: HTMLElement,
  options: OverlayButtonStyleOptions
): void {
  const layout = getOverlayButtonLayout(options.corner);
  const positionCss = layoutToCss(layout);

  el.style.cssText = `
    position: fixed;
    ${positionCss};
    width: ${OVERLAY_BUTTON_SIZE}px;
    height: ${OVERLAY_BUTTON_SIZE}px;
    z-index: ${options.zIndex};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    pointer-events: auto;
    border-radius: 50%;
    box-sizing: border-box;
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  `;
}

/**
 * Re-applies corner position (e.g. after resize or mobile controls mount).
 */
export function repositionOverlayButton(el: HTMLElement, corner: OverlayCorner): void {
  const layout = getOverlayButtonLayout(corner);
  el.style.top = '';
  el.style.bottom = layout.bottom != null ? `${layout.bottom}px` : '';
  el.style.left = layout.left != null ? `${layout.left}px` : '';
  el.style.right = layout.right != null ? `${layout.right}px` : '';
}

/** After mobile controls mount, snap settings/inventory beside them on the bottom edge. */
export function repositionAllOverlayButtons(): void {
  const settings = document.getElementById('settings-button');
  const inventory = document.getElementById('inventory-button');
  if (settings instanceof HTMLElement) {
    repositionOverlayButton(settings, 'bottom-left');
  }
  if (inventory instanceof HTMLElement) {
    repositionOverlayButton(inventory, 'bottom-right');
  }
}

const PRESS_BACKGROUND = 'rgba(0, 0, 0, 0.9)';
const PRESS_BORDER = 'rgba(255, 255, 255, 0.6)';
const DEFAULT_BACKGROUND = 'rgba(0, 0, 0, 0.7)';
const DEFAULT_BORDER = 'rgba(255, 255, 255, 0.3)';

/**
 * Blocks text/image selection and long-press callouts on overlay buttons.
 */
export function bindPreventTextSelection(el: HTMLElement): OverlayToggleBinding {
  const preventSelection = (e: Event): void => {
    e.preventDefault();
  };

  el.addEventListener('selectstart', preventSelection);
  el.addEventListener('dragstart', preventSelection);
  el.addEventListener('contextmenu', preventSelection);

  return {
    remove: () => {
      el.removeEventListener('selectstart', preventSelection);
      el.removeEventListener('dragstart', preventSelection);
      el.removeEventListener('contextmenu', preventSelection);
    }
  };
}

/**
 * Press feedback for overlay buttons (touch and mouse).
 */
export function bindOverlayPressFeedback(el: HTMLElement): OverlayToggleBinding {
  const onPress = (): void => {
    el.style.background = PRESS_BACKGROUND;
    el.style.borderColor = PRESS_BORDER;
    el.style.transform = 'scale(1.05)';
  };

  const onRelease = (): void => {
    if (el.dataset.panelOpen === 'true') {
      el.style.background = PRESS_BACKGROUND;
      el.style.borderColor = PRESS_BORDER;
    } else {
      el.style.background = DEFAULT_BACKGROUND;
      el.style.borderColor = DEFAULT_BORDER;
    }
    el.style.transform = 'scale(1)';
  };

  el.addEventListener('pointerdown', onPress);
  el.addEventListener('pointerup', onRelease);
  el.addEventListener('pointercancel', onRelease);
  el.addEventListener('pointerleave', onRelease);

  return {
    remove: () => {
      el.removeEventListener('pointerdown', onPress);
      el.removeEventListener('pointerup', onRelease);
      el.removeEventListener('pointercancel', onRelease);
      el.removeEventListener('pointerleave', onRelease);
    }
  };
}

/**
 * Toggle on pointerup; click fallback for keyboard. Stops propagation so game controls do not steal the tap.
 */
export function bindOverlayToggle(el: HTMLElement, onToggle: () => void): OverlayToggleBinding {
  let suppressClick = false;

  const stopBubble = (e: Event): void => {
    e.stopPropagation();
  };

  const handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }
    suppressClick = true;
    stopBubble(e);
    onToggle();
    window.setTimeout(() => {
      suppressClick = false;
    }, 400);
  };

  const handleClick = (e: MouseEvent): void => {
    stopBubble(e);
    if (suppressClick) {
      e.preventDefault();
      return;
    }
    onToggle();
  };

  el.addEventListener('pointerdown', stopBubble);
  el.addEventListener('pointerup', handlePointerUp);
  el.addEventListener('click', handleClick);

  return {
    remove: () => {
      el.removeEventListener('pointerdown', stopBubble);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('click', handleClick);
    }
  };
}

export interface OutsideCloseOptions {
  panel: HTMLElement;
  trigger: HTMLElement;
  isOpen: () => boolean;
  onClose: () => void;
}

/**
 * Close overlay when tapping outside panel and trigger.
 * Uses click (not capture-phase pointerdown) so mobile toggles/selects still work.
 */
export function bindOutsideClose(options: OutsideCloseOptions): OutsideCloseBinding {
  const handleClickOutside = (e: MouseEvent): void => {
    if (!options.isOpen()) {
      return;
    }

    const target = e.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (options.panel.contains(target) || options.trigger.contains(target)) {
      return;
    }

    options.onClose();
  };

  document.addEventListener('click', handleClickOutside);

  return {
    remove: () => {
      document.removeEventListener('click', handleClickOutside);
    }
  };
}
