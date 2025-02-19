import { PHYSICS_CONSTANTS } from './PhysicsConstants';
import { getA, getCx, getX, getY, relativeTime } from './MathUtils';

export class RocketPhysics {
  constructor() {
    // 初始化火箭物理参数
    this.velocity = 10;
    this.angle = PHYSICS_CONSTANTS.startAngle;
    this.mass = PHYSICS_CONSTANTS.m0;
    this.position = {x: 0, y: 0, z: 0};
    
    // 其他物理参数
    this.alpha = 0;
    this.Y = 0;
    this.P = PHYSICS_CONSTANTS.P;
    this.activePart = true;
    this.mk = PHYSICS_CONSTANTS.m0 * (1 - PHYSICS_CONSTANTS.mut); // 干重
  }

  updateVelocity(step, X) {
    // dv/dt = (P*cos(alpha) - X)/m - g*sin(theta)
    this.velocity += step * (
      ((this.P * Math.cos(this.alpha)) - X) / this.mass - 
      (PHYSICS_CONSTANTS.g0 * Math.sin(this.angle))
    );
  }

  updatePosition(step) {
    // 更新x,y位置
    this.position.x += step * this.velocity * Math.cos(this.angle);
    this.position.y += step * this.velocity * Math.sin(this.angle);
  }

  updateAngle(time) {
    if (time >= PHYSICS_CONSTANTS.tp) {
      if (!this.activePart) {
        // dtheta/dt = (P*sin(alpha) + Y)/(m*v) - (g*cos(theta))/v
        this.angle += this.step * (
          ((this.P * Math.sin(0) + this.Y) / (this.mass * this.velocity)) - 
          ((PHYSICS_CONSTANTS.g0 * Math.cos(this.angle)) / this.velocity)
        );
      } else {
        this.angle = PHYSICS_CONSTANTS.finishAngle;
      }
    } else if (time >= PHYSICS_CONSTANTS.ta) {
      // 角度变化公式
      this.angle = PHYSICS_CONSTANTS.startAngle - 
        (2 * (PHYSICS_CONSTANTS.startAngle - PHYSICS_CONSTANTS.finishAngle) * 
        relativeTime(time, PHYSICS_CONSTANTS.ta, PHYSICS_CONSTANTS.tp)) + 
        ((PHYSICS_CONSTANTS.startAngle - PHYSICS_CONSTANTS.finishAngle) * 
        Math.pow(relativeTime(time, PHYSICS_CONSTANTS.ta, PHYSICS_CONSTANTS.tp), 2));
    }
  }

  updateMass(step) {
    if (this.mass >= this.mk) {
      this.mass -= step * PHYSICS_CONSTANTS.mass_dot;
    } else {
      this.activePart = false;
      this.P = 0;
    }
  }

  // 更新火箭物理状态
  update(time, step) {
    // 计算大气参数
    const p = PHYSICS_CONSTANTS.p0 * Math.exp(-this.position.y / 10000);
    const ro = PHYSICS_CONSTANTS.ro0 * Math.exp(-this.position.y / 10000);
    
    // 计算声速和马赫数
    const a = getA(this.position.y);
    const M = this.velocity / a;
    
    // 计算阻力
    const cx = getCx(M);
    const X = getX(cx, ro, this.velocity, PHYSICS_CONSTANTS.S);

    // 更新速度和位置
    this.updateVelocity(step, X);
    this.updatePosition(step);
    this.updateAngle(time);
    this.updateMass(step);
    
    return {
      position: this.position,
      angle: this.angle,
      velocity: this.velocity,
      mass: this.mass,
      activePart: this.activePart
    };
  }
} 