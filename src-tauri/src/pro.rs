// Ключ Game Goal Pro: «GGPRO-<данные>.<подпись>» в base64url. Данные — JSON { v, n: кому, i: когда выдан },
// подпись Ed25519 закрытым ключом автора (tools/pro-key.mjs). Здесь только открытый ключ: проверка без интернета.

use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::Serialize;

const PUBLIC_KEY: [u8; 32] = [
    142, 113, 183, 50, 155, 177, 237, 122, 45, 54, 178, 176, 33, 29, 88, 178, 191, 69, 195, 84, 153, 21, 235, 104, 241,
    59, 217, 136, 221, 92, 144, 104,
];

#[derive(Serialize)]
pub struct Pro {
    name: String,
    issued: String,
}

#[tauri::command]
pub fn pro_verify(key: String) -> Result<Pro, String> {
    // При вставке в ключ могут попасть пробелы и переносы строк
    let key: String = key.chars().filter(|c| !c.is_whitespace()).collect();
    let body = key.strip_prefix("GGPRO-").ok_or("это не ключ Game Goal Pro")?;
    let (data, sig) = body.split_once('.').ok_or("ключ неполный — скопируй его целиком")?;
    let b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD;
    let data = b64.decode(data).map_err(|_| "ключ повреждён")?;
    let sig = Signature::from_slice(&b64.decode(sig).map_err(|_| "ключ повреждён")?).map_err(|_| "ключ повреждён")?;
    let vk = VerifyingKey::from_bytes(&PUBLIC_KEY).map_err(|e| e.to_string())?;
    vk.verify(&data, &sig).map_err(|_| "ключ не подходит")?;
    let v: serde_json::Value = serde_json::from_slice(&data).map_err(|_| "ключ повреждён")?;
    Ok(Pro {
        name: v["n"].as_str().unwrap_or("").into(),
        issued: v["i"].as_str().unwrap_or("").into(),
    })
}
