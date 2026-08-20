export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export const getPermissions = () => {
  try {
    return JSON.parse(localStorage.getItem("permissions") || "{}");
  } catch {
    return {};
  }
};

export const isAdmin = () => {
  const user = getStoredUser();
  return (
    user?.administrator === true ||
    user?.administrator === 1 ||
    user?.administrator === "1" ||
    user?.is_admin === true ||
    user?.is_admin === 1 ||
    user?.is_admin === "1"
  );
};

export const permissionFor = (moduleName) => {
  if (isAdmin()) return "Full";
  return getPermissions()?.[moduleName] || "None";
};

export const canView = (moduleName) =>
  ["View", "Add", "Edit", "Full"].includes(permissionFor(moduleName));

export const canAdd = (moduleName) =>
  ["Add", "Edit", "Full"].includes(permissionFor(moduleName));

export const canEdit = (moduleName) =>
  ["Edit", "Full"].includes(permissionFor(moduleName));

export const canDelete = (moduleName) =>
  permissionFor(moduleName) === "Full";

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
};

export const toInputDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

export const csvRows = (text) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const values = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === "," && !quoted) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
};
