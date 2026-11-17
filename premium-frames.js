/* K9 Template Studio — archivio suddiviso per GitHub, pixel invariati. */
window.K9_FRAME_VERSION = "4.9.15-github-light";
window.K9PremiumFrames = (() => {
  const groups = ["Mantrailing", "HRDD", "Detection", "Dogsitter"];
  const parts = window.K9_FRAME_PARTS || {};
  const expected = {"Mantrailing":["mantrailing-01","mantrailing-02","mantrailing-03","mantrailing-04","mantrailing-05","mantrailing-06","mantrailing-07","mantrailing-08"],"HRDD":["hrdd-01","hrdd-02","hrdd-03","hrdd-04","hrdd-05","hrdd-06","hrdd-07","hrdd-08"],"Detection":["detection-01","detection-02","detection-03","detection-04","detection-05","detection-06","detection-07","detection-08"],"Dogsitter":["dogsitter-01","dogsitter-02"]};
  const all = groups.flatMap(group => {
    const items = expected[group].flatMap(id => {
      const part = parts[id];
      if (!part || part.version !== window.K9_FRAME_VERSION || part.group !== group || !Array.isArray(part.items) || part.items.some(x => x.group !== group)) throw new Error("Archivio cornici incompleto: " + id);
      return part.items;
    });
    if (items.length !== 30) throw new Error("Archivio cornici incompleto: " + group);
    return items;
  });
  const lookup = new Map(all.map(x=>[x.id,x]));
  const order = ["mt_trackmaster","mt_compass","mt_notturno","mt_urban","mt_harness","mt_vetta","mt_mappe","mt_beacon","mt_ridge","mt_linea","hrdd_evidence","hrdd_marker","hrdd_strato","hrdd_quadro","hrdd_lab","hrdd_catena","hrdd_reliquia","hrdd_soilscan","hrdd_memorial","hrdd_archive","det_vector","det_sensor","det_nexus","det_impulse","det_vial","det_prisma","det_target","det_micro","det_velarium","det_matrix","ds_boutique","ds_home","ds_playful","ds_heart","ds_park","ds_collar","ds_suite","ds_gardenia","ds_velluto","ds_lounge","mt_ultra_n01","mt_ultra_n02","mt_ultra_n03","mt_ultra_n04","mt_ultra_n05","mt_ultra_n06","mt_ultra_n07","mt_ultra_n08","mt_ultra_n09","mt_ultra_n10","mt_ultra_n11","mt_ultra_n12","mt_ultra_n13","mt_ultra_n14","mt_ultra_n15","mt_ultra_n16","mt_ultra_n17","mt_ultra_n18","mt_ultra_n19","mt_ultra_n20","hr_ultra_n01","hr_ultra_n02","hr_ultra_n03","hr_ultra_n04","hr_ultra_n05","hr_ultra_n06","hr_ultra_n07","hr_ultra_n08","hr_ultra_n09","hr_ultra_n10","hr_ultra_n11","hr_ultra_n12","hr_ultra_n13","hr_ultra_n14","hr_ultra_n15","hr_ultra_n16","hr_ultra_n17","hr_ultra_n18","hr_ultra_n19","hr_ultra_n20","dt_ultra_n01","dt_ultra_n02","dt_ultra_n03","dt_ultra_n04","dt_ultra_n05","dt_ultra_n06","dt_ultra_n07","dt_ultra_n08","dt_ultra_n09","dt_ultra_n10","dt_ultra_n11","dt_ultra_n12","dt_ultra_n13","dt_ultra_n14","dt_ultra_n15","dt_ultra_n16","dt_ultra_n17","dt_ultra_n18","dt_ultra_n19","dt_ultra_n20","ds_ultra_n01","ds_ultra_n02","ds_ultra_n03","ds_ultra_n04","ds_ultra_n05","ds_ultra_n06","ds_ultra_n07","ds_ultra_n08","ds_ultra_n09","ds_ultra_n10","ds_ultra_n11","ds_ultra_n12","ds_ultra_n13","ds_ultra_n14","ds_ultra_n15","ds_ultra_n16","ds_ultra_n17","ds_ultra_n18","ds_ultra_n19","ds_ultra_n20"];
  if (lookup.size !== order.length || order.some(id=>!lookup.has(id))) throw new Error("Archivio cornici non valido");
  const catalog = Object.freeze(order.map(id=>Object.freeze(lookup.get(id))));
  delete window.K9_FRAME_PARTS;

  const byId = new Map(catalog.map(item => [item.id, item]));
  const decoded = new Map(), pending = new Map();
  function ensure(id) {
    if (!id || id === "none") return Promise.resolve(null);
    if (decoded.has(id)) return Promise.resolve(decoded.get(id));
    if (pending.has(id)) return pending.get(id);
    const asset = byId.get(id);
    if (!asset) return Promise.reject(new Error("Cornice non disponibile nell'archivio aggiornato"));
    const task = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth !== asset.width || image.naturalHeight !== asset.height) {
          reject(new Error("Cornice non valida"));
          return;
        }
        decoded.set(id, image);
        while (decoded.size > 18) {
          const oldest = decoded.keys().next().value;
          if (!oldest || oldest === id) break;
          decoded.delete(oldest);
        }
        resolve(image);
      };
      image.onerror = () => reject(new Error("Impossibile caricare la cornice"));
      image.src = asset.src;
    }).finally(() => pending.delete(id));
    pending.set(id, task);
    return task;
  }
  function draw(g, W, H, id) {
    if (!id || id === "none") return true;
    const im = decoded.get(id);
    if (!im) return false;
    const sw = im.naturalWidth, sh = im.naturalHeight;
    if (byId.get(id)?.fullOverlay) {
      const sx = Math.round(sw * 0.35), sy = Math.round(sh * 0.33), s = Math.min(W / sw, H / sh);
      const X = [0, sx, sw - sx, sw], Y = [0, sy, sh - sy, sh];
      const dx = [0, sx * s, W - sx * s, W], dy = [0, sy * s, H - sy * s, H];
      g.save();
      try {
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = "high";
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
          if (x === 1 && y === 1) continue;
          g.drawImage(im, X[x], Y[y], X[x + 1] - X[x], Y[y + 1] - Y[y], dx[x], dy[y], dx[x + 1] - dx[x], dy[y + 1] - dy[y]);
        }
      } finally {
        g.restore();
      }
      return true;
    }
    const sx = Math.round(sw * 0.32), sy = Math.round(sh * 0.35);
    const edge = Math.min(W, H) * 0.148, d = 4;
    const X = [0, sx, sw - sx, sw], Y = [0, sy, sh - sy, sh];
    const dx = [d, d + edge, W - d - edge, W - d], dy = [d, d + edge, H - d - edge, H - d];
    g.save();
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    const rail = Math.min(W, H) * 0.095;
    g.beginPath();
    g.rect(d, d, W - 2 * d, rail);
    g.rect(d, H - d - rail, W - 2 * d, rail);
    g.rect(d, d, rail, H - 2 * d);
    g.rect(W - d - rail, d, rail, H - 2 * d);
    for (const x of [d, W - d - edge]) for (const y of [d, H - d - edge]) g.rect(x, y, edge, edge);
    g.clip();
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      if (x === 1 && y === 1) continue;
      const a = X[x + 1] - X[x], b = Y[y + 1] - Y[y];
      g.drawImage(im, X[x], Y[y], a, b, dx[x], dy[y], dx[x + 1] - dx[x], dy[y + 1] - dy[y]);
    }
    g.restore();
    return true;
  }
  return Object.freeze({ catalog, ids: catalog.map(a => a.id), ensure, draw, isReady: id => id === "none" || decoded.has(id) });
})();
