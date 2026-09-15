// Google Apps Script — Web App que administra las carpetas de fotos en Google Drive.
//
// CÓMO DESPLEGAR (una sola vez, en tu cuenta Google, sin Google Cloud ni tarjeta):
//   1. Ir a https://script.google.com → Nuevo proyecto
//   2. Borrar el código de ejemplo y pegar TODO este archivo
//   3. En la línea `SCRIPT_SECRET`, cambiar "CAMBIA_ESTE_SECRETO" por un valor aleatorio largo
//   4. Guardar (Ctrl+S) con nombre "inmobiliaria-caribe-drive"
//   5. Implementar → Nueva implementación → Tipo: "Aplicación web"
//        - Ejecutar como: "Yo"
//        - Quién tiene acceso: "Cualquier usuario"
//   6. Copiar la URL (algo como https://script.google.com/macros/s/.../exec)
//
// LUEGO en Supabase (Edge Functions → Secrets):
//   APPS_SCRIPT_URL    = la URL copiada
//   APPS_SCRIPT_SECRET = el MISMO valor que pusiste en SCRIPT_SECRET

const SCRIPT_SECRET = '099017849327834';
const ROOT_FOLDER = 'catalogo_inmuebles';

function doPost(e) {
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);

  let result;
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.secret !== SCRIPT_SECRET) {
      result = { error: 'no autorizado' };
    } else {
      switch (body.action) {
        case 'createFolder':
          result = createFolder(body.name);
          break;
        case 'list':
          result = listFolder(body.folderId);
          break;
        case 'sync':
          result = syncFolder(body.folderId, Boolean(body.isActive));
          break;
        case 'setVisibility':
          result = setVisibility(body.folderId, Boolean(body.isActive));
          break;
        case 'upload':
          result = uploadFile(body.folderId, body.name, body.mimeType, body.data, Boolean(body.isActive));
          break;
        case 'delete':
          result = deleteFile(body.folderId, body.fileId);
          break;
        case 'setFileVisibility':
          result = setFileVisibility(body.fileId, Boolean(body.isActive));
          break;
        default:
          result = { error: 'accion desconocida' };
      }
    }
  } catch (err) {
    result = { error: String(err) };
  }

  out.setContent(JSON.stringify(result));
  return out;
}

function getRootFolder() {
  const it = DriveApp.getFoldersByName(ROOT_FOLDER);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(ROOT_FOLDER);
}

function createFolder(rawName) {
  const name = String(rawName || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const suffix = Utilities.getUuid().slice(0, 8);
  const folderName = name + '-' + suffix;
  const folder = getRootFolder().createFolder(folderName);
  return { folderId: folder.getId(), folderName: folder.getName() };
}

function getFiles(folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    files.push({ id: f.getId(), name: f.getName() });
  }
  return files;
}

function listFolder(folderId) {
  return { files: getFiles(folderId) };
}

function applyVisibility(folderId, isActive) {
  const folder = DriveApp.getFolderById(folderId);
  const access = isActive ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE;
  const it = folder.getFiles();
  while (it.hasNext()) {
    it.next().setSharing(access, DriveApp.Permission.VIEW);
  }
}

function syncFolder(folderId, isActive) {
  applyVisibility(folderId, isActive);
  const files = getFiles(folderId).map(function (f, i) {
    return {
      id: f.id,
      name: f.name,
      order: i,
      url: 'https://lh3.googleusercontent.com/d/' + f.id,
    };
  });
  return { files: files };
}

function setVisibility(folderId, isActive) {
  applyVisibility(folderId, isActive);
  return { ok: true };
}

function setFileVisibility(fileId, isActive) {
  const access = isActive ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE;
  DriveApp.getFileById(fileId).setSharing(access, DriveApp.Permission.VIEW);
  return { ok: true };
}

function uploadFile(folderId, name, mimeType, data, isActive) {
  const bytes = Utilities.base64Decode(String(data || ''));
  const blob = Utilities.newBlob(bytes, mimeType || 'image/jpeg', name);
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);
  const access = isActive ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE;
  file.setSharing(access, DriveApp.Permission.VIEW);
  return {
    id: file.getId(),
    name: file.getName(),
    url: 'https://lh3.googleusercontent.com/d/' + file.getId(),
  };
}

function deleteFile(folderId, fileId) {
  const folder = DriveApp.getFolderById(folderId);
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getId() === fileId) {
      f.setTrashed(true);
      return { ok: true };
    }
  }
  return { error: 'archivo no encontrado en la carpeta' };
}
