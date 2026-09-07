/** Inline before paint — avoids flash of wrong theme */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("areo-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;
