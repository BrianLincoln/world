import * as THREE from 'three';

// Must run before any module constructs a THREE.Color: palette hex values are
// display-referred and must not be converted to linear.
THREE.ColorManagement.enabled = false;
