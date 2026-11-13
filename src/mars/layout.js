// mars/layout – Feste Daten der Marsbasis: ebene Flächen, Hindernisse der Kamera, Wohnmodule, Dunst (HZ), Krater, Teilchenfarben.
// Exporte: AST_YAW, CRATERS, DUST, FLAT, HAB, OBST, ROVER_YAW, STEAM
// Erzeugt von tools/refactor/split.mjs aus src/sonnensystem.html – bis zum Ende des Umbaus nicht von Hand ändern.

const FLAT = [[120,-40,420],[430,-40,115]];                                // eingeebnete Flächen: x, z, Radius
// Bauten, über die die Kamera steigt, statt hindurchzufahren: x, z, Radius, Höhe
const OBST = [[12,-30,6,5],[0,0,9.5,10.5],[-18,-4,7.5,8.5],[15,-11,7.5,8.5],[3,18,7.5,8.5],[42,17,16,5.5],[-46,38,9,7.5],[-30,-25,11,6.5],[-9,-36,11,6.5],[430,-40,10,15],[275,-85,16,14],[62,-72,9,12],[90,-94,2,15.5],[30,-58,9,8]];
const HAB = [[-18,-4,.35],[15,-11,2.7],[3,18,-1.35]];                       // Wohnmodule um die Kuppel: x, z, Drehung
const DUST = [.64,.44,.29], STEAM = [.8,.8,.84];
const AST_YAW = 0, ROVER_YAW = 0;                 // Blickrichtung des Astronauten-Modells gegenüber der Laufrichtung
// Krater: x, z, Radius, Tiefe
const CRATERS = [[-185,-150,46,9],[150,235,58,11],[560,190,85,15],[-380,300,70,13],[420,-470,60,11],[-90,520,95,16]];

export { AST_YAW, CRATERS, DUST, FLAT, HAB, OBST, ROVER_YAW, STEAM };
