(async () => {
  "use strict";
  const user = await Hub.requireUser(); if (!user) return;
  Hub.renderBar(user);
})();
