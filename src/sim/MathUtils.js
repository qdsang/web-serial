import { HEIGHT_ARRAY, SOUND_SPEED_ARRAY } from './PhysicsConstants';

// 计算相对时间
export const relativeTime = (time, ta, tp) => {
  return (time - ta) / (tp - ta);
}

// 计算空气阻力
export const getX = (Cx, ro, V, S) => {
  return 0.5 * Cx * ro * S * Math.pow(V, 2);
}

// 根据高度获取声速
export const getA = (h) => {
  if (h > 80000) {
    return 282.5;
  }
  
  for (let i = 0; i < HEIGHT_ARRAY.length; i++) {
    if (h <= HEIGHT_ARRAY[i]) {
      return SOUND_SPEED_ARRAY[i];
    }
  }
}

// 计算升力
export const getY = (Cy, ro, V, alpha, S) => {
  return 0.5 * Cy * ro * S * alpha * Math.pow(V, 2);
}

// 计算阻力系数
export const getCx = (M) => {
  if (M >= 0 && M <= 0.8) {
    return 0.29;
  } else if (M > 0.8 && M <= 1.068) {
    return M - 0.51;
  } else {
    return 0.091 + (0.5 * Math.pow(M, -1));
  }
}

// 数字四舍五入
export const roundNum = (value, num = 2) => {
  return Math.round(value * 10 * num) / (10 * num);
}
