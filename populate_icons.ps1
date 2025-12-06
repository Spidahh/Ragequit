$files = @(
    "melee_slash.png", "melee_block.png", "sword_pull.png", "whirlwind.png",
    "bow_shot.png", "multi_shot.png", "explosive_shot.png", "rapid_fire.png",
    "fireball.png", "ice_shard.png", "blink.png", "nova.png",
    "heal.png", "trans_stm_hp.png", "trans_hp_mana.png", "trans_mana_stm.png"
)

foreach ($file in $files) {
    Copy-Item "assets/icons/generic_icon.png" -Destination "assets/icons/$file" -Force
}
