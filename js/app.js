import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.APP_DATA = { brands: [] };
const APP_DATA = window.APP_DATA;

const REGION_LABELS = {
  en_us: "US",
  en_ca: "CA"
};

const BRAND_TEMPLATES = {
  ford: {
    assets: ({ locale, slug, year }) =>
      `/content/dam/na/ford/${locale}/images/${slug}/${year}`,

    vdmAssets: ({ locale, slug, year }) =>
      `/content/dam/vdm_ford/live/${locale}/ford/nameplate/${slug}/${year}/collections`,

    vdmRoot: ({ locale, slug, year }) =>
      `/content/vdm_ford/live/${locale}/ford/nameplate/${slug}/${year}`,

    vdmModels: ({ locale, slug, year }) =>
      `/content/vdm_ford/live/${locale}/ford/nameplate/${slug}/${year}/model`,

    cf: ({ locale, slug, year }) =>
      `/content/dam/na/cf/ford/${locale}/nameplate/${slug}/${year}`,

    inlineDisclosure: ({ locale }) =>
      `/content/dam/na/cf/ford/${locale}/common/disclosures/inline-disclosures`,

    xf: ({ locale, slug, year }) =>
      `/content/experience-fragments/na/ford/${locale}/nameplate/${slug}/${year}`,

    siteRoot: ({ locale, siteType, slug }) =>
      `/content/na/ford/${locale}/${siteType}/${slug}`,

    siteYear: ({ locale, siteType, slug, year }) =>
      `/content/na/ford/${locale}/${siteType}/${slug}/${year}`
  },

  lincoln: {
    assets: ({ locale, slug, year }) =>
      `/content/dam/na/lincoln/${locale}/images/${slug}/${year}`,

    vdmAssets: ({ locale, slug, year }) =>
      `/content/dam/vdm_ford/live/${locale}/lincoln/nameplate/${slug}/${year}/collections`,

    vdmRoot: ({ locale, slug, year }) =>
      `/content/vdm_ford/live/${locale}/lincoln/nameplate/${slug}/${year}`,

    vdmModels: ({ locale, slug, year }) =>
      `/content/vdm_ford/live/${locale}/lincoln/nameplate/${slug}/${year}/model`,

    cf: ({ locale, slug, year }) =>
      `/content/dam/na/cf/lincoln/${locale}/nameplate/${slug}/${year}`,

    inlineDisclosure: ({ locale }) =>
      `/content/dam/na/cf/lincoln/${locale}/common/disclosures/inline-disclosures`,

    xf: ({ locale, slug, year }) =>
      `/content/experience-fragments/na/lincoln/${locale}/${locale === "en_ca" ? "nameplate" : "namplates"}/${slug}/${year}`,

    siteRoot: ({ locale, siteType, slug }) =>
      `/content/na/lincoln/${locale}/${siteType}/${slug}`,

    siteYear: ({ locale, siteType, slug, year }) =>
      `/content/na/lincoln/${locale}/${siteType}/${slug}/${year}`
  }
};

const els = {
  authorBase: document.getElementById("authorBase"),
  brandSelect: document.getElementById("brandSelect"),
  regionSelect: document.getElementById("regionSelect"),

  vehicleSelect: document.getElementById("vehicleSelect"),
  siteType: document.getElementById("siteType"),
  year: document.getElementById("year"),
  vehicleSlug: document.getElementById("vehicleSlug"),

  includeInlineDisclosure: document.getElementById("includeInlineDisclosure"),

  generatePathsBtn: document.getElementById("generatePathsBtn"),
  clearFormBtn: document.getElementById("clearFormBtn"),
  copyCurrentBtn: document.getElementById("copyCurrentBtn"),
  clearProjectsBtn: document.getElementById("clearProjectsBtn"),

  output: document.getElementById("output"),
  toast: document.getElementById("toast")
};

function showToast(message) {
  if (!els.toast) return;

  els.toast.textContent = message;
  els.toast.classList.add("show");

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    els.toast.classList.remove("show");
  }, 1800);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Texto copiado");
  } catch (error) {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    showToast("Texto copiado");
  }
}

function getBrandByKey(brandKey) {
  return APP_DATA.brands.find(brand => brand.key === brandKey) || null;
}

function getSelectedBrandKey() {
  return els.brandSelect.value.trim();
}

function getSelectedRegionCode() {
  return els.regionSelect.value.trim();
}

function getSlug(vehicle, specificSlugProp) {
  if (vehicle[specificSlugProp] !== undefined) {
    return vehicle[specificSlugProp];
  }
  return vehicle.slug;
}

function buildVehicleOptionValue(brandKey, vehicle) {
  return JSON.stringify({
    brandKey,
    ...vehicle
  });
}

function populateBrandDropdown() {
  els.brandSelect.innerHTML = `<option value="">Seleccionar brand...</option>`;

  APP_DATA.brands.forEach(brand => {
    const option = document.createElement("option");
    option.value = brand.key;
    option.textContent = brand.label;
    els.brandSelect.appendChild(option);
  });
}

function populateRegionDropdown(brandKey, preservedValue = "") {
  els.regionSelect.innerHTML = `<option value="">Seleccionar region...</option>`;

  const brand = getBrandByKey(brandKey);
  if (!brand) return;

  brand.regions.forEach(regionCode => {
    const option = document.createElement("option");
    option.value = regionCode;
    option.textContent = REGION_LABELS[regionCode] || regionCode;
    els.regionSelect.appendChild(option);
  });

  if (preservedValue && brand.regions.includes(preservedValue)) {
    els.regionSelect.value = preservedValue;
  }
}

function vehicleAllowedForBrandRegion(vehicle, brandKey, regionCode) {
  if (brandKey === "ford" && regionCode === "en_ca") {
    const siteSlug = getSlug(vehicle, "siteSlug");
    if (siteSlug === "edge") return false;
    if (siteSlug === "transit-cargo-van") return false;
  }

  return true;
}

function populateVehicleDropdown(brandKey, regionCode, preservedValue = "") {
  els.vehicleSelect.innerHTML = `<option value="">Seleccionar vehículo...</option>`;

  const brand = getBrandByKey(brandKey);
  if (!brand) return;

  const allowedVehicles = brand.vehicles.filter(vehicle =>
    vehicleAllowedForBrandRegion(vehicle, brandKey, regionCode)
  );

  const groups = {};

  allowedVehicles.forEach(vehicle => {
    if (!groups[vehicle.siteType]) {
      groups[vehicle.siteType] = [];
    }
    groups[vehicle.siteType].push(vehicle);
  });

  Object.keys(groups).forEach(siteType => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = siteType;

    groups[siteType].forEach(vehicle => {
      const option = document.createElement("option");
      option.value = buildVehicleOptionValue(brandKey, vehicle);
      option.textContent = vehicle.name;
      optgroup.appendChild(option);
    });

    els.vehicleSelect.appendChild(optgroup);
  });

  if (preservedValue) {
    const exists = Array.from(els.vehicleSelect.options).some(
      option => option.value === preservedValue
    );

    if (exists) {
      els.vehicleSelect.value = preservedValue;
    }
  }
}

function getSelectedVehicleData() {
  const raw = els.vehicleSelect.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error parseando vehículo seleccionado:", error);
    return null;
  }
}

function syncVehicleFields() {
  const selected = getSelectedVehicleData();

  if (!selected) {
    els.siteType.value = "";
    els.vehicleSlug.value = "";
    return;
  }

  els.siteType.value = selected.siteType || "";
  els.vehicleSlug.value = getSlug(selected, "siteSlug") || "";
}

function handleBrandChange() {
  const brandKey = getSelectedBrandKey();

  els.output.value = "";
  els.siteType.value = "";
  els.vehicleSlug.value = "";
  els.vehicleSelect.innerHTML = `<option value="">Seleccionar vehículo...</option>`;

  populateRegionDropdown(brandKey);

  if (!brandKey) return;
}

function handleRegionChange() {
  const brandKey = getSelectedBrandKey();
  const regionCode = getSelectedRegionCode();
  const previousValue = els.vehicleSelect.value;
  const previousVehicle = getSelectedVehicleData();

  els.output.value = "";
  populateVehicleDropdown(brandKey, regionCode, previousValue);
  syncVehicleFields();

  const currentVehicle = getSelectedVehicleData();

  if (previousVehicle && !currentVehicle) {
    if (brandKey === "ford" && regionCode === "en_ca") {
      const prevSiteSlug = getSlug(previousVehicle, "siteSlug");
      if (prevSiteSlug === "edge") {
        showToast("Edge no está disponible para CA");
      } else if (prevSiteSlug === "transit-cargo-van") {
        showToast("Transit Cargo Van no está disponible para CA");
      }
    }
  }
}

function clearForm() {
  els.brandSelect.value = "";
  els.regionSelect.innerHTML = `<option value="">Seleccionar region...</option>`;
  els.vehicleSelect.innerHTML = `<option value="">Seleccionar vehículo...</option>`;

  els.siteType.value = "";
  els.vehicleSlug.value = "";
  els.year.value = "";
  els.includeInlineDisclosure.checked = false;
}

function getFormData() {
  return {
    authorBase: els.authorBase.value.trim(),
    brandKey: getSelectedBrandKey(),
    regionCode: getSelectedRegionCode(),
    selected: getSelectedVehicleData(),
    year: els.year.value.trim(),
    includeInlineDisclosure: els.includeInlineDisclosure.checked
  };
}

function resolveRegionSlug(defaultSlug, slugByRegion, regionCode) {
  if (slugByRegion && slugByRegion[regionCode]) {
    return slugByRegion[regionCode];
  }
  return defaultSlug;
}

function toAuthorAssetsUrl(authorBase, path) {
  return `${authorBase}/ui#/aem/assets.html${path}`;
}

function toAuthorVdmUrl(authorBase, path) {
  return `${authorBase}/ui#/aem/vdm.html/browse${path}`;
}

function toAuthorXfUrl(authorBase, path) {
  return `${authorBase}/ui#/aem/aem/experience-fragments.html${path}`;
}

function toAuthorSitesUrl(authorBase, path) {
  return `${authorBase}/ui#/aem/sites.html${path}`;
}

function addSingleUrlSection(lines, title, url, suffix = "") {
  if (!url) return;

  lines.push(title);
  lines.push(url + (suffix ? ` ${suffix}` : ""));
  lines.push("");
}

function addAssetsSection(lines, vdmAssetsUrl, assetsUrl) {
  const urls = [];

  if (vdmAssetsUrl) urls.push(`${vdmAssetsUrl} - TREE PUBLISH`);
  if (assetsUrl) urls.push(`${assetsUrl} - TREE PUBLISH`);

  if (!urls.length) return;

  lines.push("ASSETS");
  urls.forEach(url => lines.push(url));
  lines.push("");
}

function addVdmSection(lines, vdmModelsUrl, vdmRootUrl) {
  if (!vdmModelsUrl && !vdmRootUrl) return;

  lines.push("VDM");
  lines.push("");

  if (vdmModelsUrl) {
    lines.push(vdmModelsUrl);
    lines.push(">> all models");
    lines.push("");
  }

  if (vdmRootUrl) {
    lines.push(vdmRootUrl);
    lines.push(">> Tree Publish The Following Paths:");
    lines.push(">> Collections");
    lines.push(">> Options");
    lines.push(">> Specifications");
    lines.push("");
  }
}

function addSiteSection(lines, siteYearUrl, siteRootUrl, year) {
  lines.push("Site");
  lines.push(`${siteYearUrl} - TREE PUBLISH`);
  lines.push("");
  lines.push(siteRootUrl);
  lines.push(`>> ${year}`);
}

function buildProjectText(project) {
  const templates = BRAND_TEMPLATES[project.brandKey];
  if (!templates) {
    throw new Error(`No hay templates para la brand: ${project.brandKey}`);
  }

  const locale = project.regionCode;

  const siteRootPath = templates.siteRoot({
    locale,
    siteType: project.siteType,
    slug: project.siteSlug
  });

  const siteYearPath = templates.siteYear({
    locale,
    siteType: project.siteType,
    slug: project.siteSlug,
    year: project.year
  });

  const siteRootUrl = toAuthorSitesUrl(project.authorBase, siteRootPath);
  const siteYearUrl = toAuthorSitesUrl(project.authorBase, siteYearPath);

  let assetsUrl = null;
  let cfUrl = null;
  let xfUrl = null;
  let vdmModelsUrl = null;
  let vdmRootUrl = null;
  let vdmAssetsUrl = null;

  if (project.assetsSlug) {
    const assetsPath = templates.assets({
      locale,
      slug: project.assetsSlug,
      year: project.year
    });
    assetsUrl = toAuthorAssetsUrl(project.authorBase, assetsPath);
  }

  if (project.cfSlug) {
    const cfPath = templates.cf({
      locale,
      slug: project.cfSlug,
      year: project.year
    });
    cfUrl = toAuthorAssetsUrl(project.authorBase, cfPath);
  }

  if (project.xfSlug) {
    const xfPath = templates.xf({
      locale,
      slug: project.xfSlug,
      year: project.year
    });
    xfUrl = toAuthorXfUrl(project.authorBase, xfPath);
  }

  if (project.vdmSlug) {
    const vdmRootPath = templates.vdmRoot({
      locale,
      slug: project.vdmSlug,
      year: project.year
    });

    const vdmModelsPath = templates.vdmModels({
      locale,
      slug: project.vdmSlug,
      year: project.year
    });

    const vdmAssetsPath = templates.vdmAssets({
      locale,
      slug: project.vdmSlug,
      year: project.year
    });

    vdmRootUrl = toAuthorVdmUrl(project.authorBase, vdmRootPath);
    vdmModelsUrl = toAuthorVdmUrl(project.authorBase, vdmModelsPath);
    vdmAssetsUrl = toAuthorAssetsUrl(project.authorBase, vdmAssetsPath);
  }

  const inlineDisclosurePath = templates.inlineDisclosure({ locale });
  const inlineDisclosureUrl = toAuthorAssetsUrl(project.authorBase, inlineDisclosurePath);

  const lines = [];

  addAssetsSection(lines, vdmAssetsUrl, assetsUrl);
  addVdmSection(lines, vdmModelsUrl, vdmRootUrl);

  if (cfUrl) {
    lines.push("Content Fragments");
    lines.push(`${cfUrl} - TREE PUBLISH`);
    lines.push("");

    if (project.cfFolders && project.cfFolders.length > 0) {
      const cfBasePath = cfUrl.replace(`/${project.year}`, "");

      project.cfFolders.forEach(folder => {
        lines.push(`${cfBasePath}/${folder.toLowerCase().trim()} - TREE PUBLISH`);
        lines.push("");
      });

      lines.push(cfBasePath);
      lines.push(`>> ${project.name} Billboard`);
      lines.push("");
    }
  }

  if (project.includeInlineDisclosure) {
    addSingleUrlSection(lines, "Inline disclosure", inlineDisclosureUrl, "- TREE PUBLISH");
  }

  addSingleUrlSection(lines, "XF", xfUrl, "- TREE PUBLISH");
  addSiteSection(lines, siteYearUrl, siteRootUrl, project.year);

  return lines.join("\n").trim();
}

function generatePaths() {
  const form = getFormData();
  if (!form.authorBase) {
    alert("Falta Author base.");
    return;
  }

  if (!form.brandKey) {
    alert("Selecciona una brand.");
    return;
  }

  if (!form.regionCode) {
    alert("Selecciona una region.");
    return;
  }

  if (!form.selected) {
    alert("Selecciona un vehículo.");
    return;
  }

  if (!form.year) {
    alert("Falta Año.");
    return;
  }

  // Alerta requerida antes de generar
  alert("Advertencia faltan los paths de cada model de VDM");

  const project = {
    authorBase: form.authorBase,
    brandKey: form.brandKey,
    regionCode: form.regionCode,
    name: form.selected.name,
    cfFolders: form.selected.cfFolders || [],
    siteType: form.selected.siteType,
    siteSlug: getSlug(form.selected, "siteSlug"),
    assetsSlug: resolveRegionSlug(
      getSlug(form.selected, "assetsSlug"),
      form.selected.assetsSlugByRegion,
      form.regionCode
    ),
    cfSlug: resolveRegionSlug(
      getSlug(form.selected, "cfSlug"),
      form.selected.cfSlugByRegion,
      form.regionCode
    ),
    xfSlug: resolveRegionSlug(
      getSlug(form.selected, "xfSlug"),
      form.selected.xfSlugByRegion,
      form.regionCode
    ),
    vdmSlug: resolveRegionSlug(
      getSlug(form.selected, "vdmSlug"),
      form.selected.vdmSlugByRegion,
      form.regionCode
    ),
    year: form.year,
    includeInlineDisclosure: form.includeInlineDisclosure
  };

  try {
    els.output.value = buildProjectText(project);
    showToast("Paths generados");
  } catch (error) {
    console.error(error);
    alert("No se pudieron generar los paths para esta combinación.");
  }
}

async function loadApp() {
  els.brandSelect.innerHTML = `<option value="">Cargando datos desde la nube...</option>`;
  els.brandSelect.disabled = true;

  try {
    const brandsSnap = await getDocs(collection(db, "brands"));
    const vehiclesSnap = await getDocs(collection(db, "vehicles"));

    const brands = [];
    brandsSnap.forEach(doc => brands.push(doc.data()));

    const vehicles = [];
    vehiclesSnap.forEach(doc => vehicles.push(doc.data()));

    brands.forEach(brand => {
      brand.vehicles = vehicles.filter(v => v.brandKey === brand.key);
    });

    APP_DATA.brands = brands;
  } catch (error) {
    console.error("Error cargando base de datos:", error);
    alert("Error de conexión con la base de datos.");
    return;
  }

  els.brandSelect.disabled = false;

  if (!Array.isArray(APP_DATA.brands) || APP_DATA.brands.length === 0) {
    console.error("APP_DATA no está disponible o está vacío.");
    alert("No se pudo cargar la data de la app.");
    return;
  }

  populateBrandDropdown();

  els.brandSelect.addEventListener("change", handleBrandChange);
  els.regionSelect.addEventListener("change", handleRegionChange);
  els.vehicleSelect.addEventListener("change", syncVehicleFields);

  els.generatePathsBtn.addEventListener("click", generatePaths);
  els.clearFormBtn.addEventListener("click", clearForm);

  els.copyCurrentBtn.addEventListener("click", async () => {
    if (!els.output.value.trim()) {
      alert("No hay texto para copiar.");
      return;
    }
    await copyText(els.output.value);
  });

  els.clearProjectsBtn.addEventListener("click", () => {
    els.output.value = "";
    showToast("Contenido eliminado");
  });
}

// LÓGICA DE LOGIN Y SEGURIDAD
const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Si entró, es porque existe en tu Firebase (tú le creaste la cuenta)
    loginScreen.style.display = "none";
    appContainer.style.display = "block";
    await loadApp();
  } else {
    // Sesión cerrada
    loginScreen.style.display = "flex";
    appContainer.style.display = "none";
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    loginError.textContent = "Ingresa correo y contraseña.";
    loginError.style.display = "block";
    return;
  }

  // Removed redundant alert
  try {
    loginError.style.display = "none";
    loginBtn.textContent = "Cargando...";
    loginBtn.disabled = true;
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    loginError.textContent = "Credenciales incorrectas.";
    loginError.style.display = "block";
    console.error(error);
  } finally {
    loginBtn.textContent = "Iniciar sesión";
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => {
  signOut(auth);
});