var Box2D = require('box2dweb');
var clamp = require('./clamp');
var b2Vec2 = Box2D.Common.Math.b2Vec2;

var EntityComponent = require('./EntityComponent');

// Proportional to surface drag
const DRAG_CONSTANT = 0.05;
// Proportional to force applied while using WASD
const MOVEMENT_IMPULSE_CONSTANT  = 1;

class PlayerMovementComponent extends EntityComponent {
  constructor(props) {
    super(props);
    this.player = this.props.player || null;

    this.speed = this.props.speed || 1;
    this.range = this.props.range || 50;
    this.fireInterval = this.props.fireInterval || 0.25;
    this.nextFireTime = 0;
  }

  serialize() {
    if (!this.player) {
      return {};
    }
    var playerID = this.player.id;
    return {
      playerID,
    };
  }

  // Apply a drag force proportional to drag_constant
  _applyDrag(body, drag_constant) {
    var v = body.GetLinearVelocity().Copy();
    v.Multiply(-1 * drag_constant);
    if (v.Length()) {
      body.ApplyImpulse(v, body.GetWorldCenter());
    }
  }


  // Apply physics params to @param body for this frame given @param input_state
  // If velocity is below a threshold apply an impulse 
  _setPlayerDesiredVelocity(body, input_state) {
    var xvel_target = 0;
    var yvel_target = 0;
    if (input_state.left) {
      xvel_target += -1;
    }
    if (input_state.right) {
      xvel_target += 1;
    }
    if (input_state.forward) {
      yvel_target += -1;
    }
    if (input_state.backward) {
      yvel_target += 1;
    }
    var impulse = b2Vec2.Make(xvel_target * MOVEMENT_IMPULSE_CONSTANT,
          yvel_target * MOVEMENT_IMPULSE_CONSTANT);
    if (impulse.Length()) {
      body.ApplyImpulse(impulse, body.GetWorldCenter());
    } else {
      this._applyDrag(body, DRAG_CONSTANT);
    }
  }

  think(dt) {
    this.nextFireTime -= dt;

    var entity = this.getEntity();
    var body = entity && entity.getBody();
    var player = this.player;
    if (!player || !body) {
      return;
    }

    var input_state = player.inputState;

    var current_angle = body.GetAngle();
    var new_angle = input_state.mouse_angle || 0;

    if (new_angle != current_angle) {
      body.SetAngle(new_angle);
    }

    this._setPlayerDesiredVelocity(body, input_state);

    var player_vel = body.GetLinearVelocity();
    if (player_vel.Length() > this.speed) {
      player_vel.Multiply(this.speed / player_vel.Length());
      body.SetLinearVelocity(player_vel);
    }

    if (input_state.fire && this.nextFireTime <= 0) {
      this.nextFireTime = this.fireInterval;
      var world = body.GetWorld();

      var position = body.GetPosition();
      var angle = body.GetAngle();
      var length = this.range;
      var end = new b2Vec2(position.x + length * Math.cos(angle), position.y + length * -Math.sin(angle));

      var hitEntity = null;
      var hitPoint = null;
      var hitNormal = null;
      var lowestFraction = 1;
      var callback = (fixture, point, normal, fraction) => {
        if (fixture.IsSensor()) {
          return lowestFraction;
        }

        if (fraction > lowestFraction) {
          return fraction;
        }
        lowestFraction = fraction;

        var body = fixture.GetBody();
        var entity = body.GetUserData();

        hitPoint = point;

        if (entity) {
          hitEntity = entity;
          hitPoint = point;
          hitNormal = normal;
        } else {
          hitEntity = null;
        }

        return fraction;
      };
      world.RayCast(callback, position, end);

      if (hitEntity) {
        var shot_result = hitEntity.onShot({
          from: this.getEntity(),
          point: hitPoint,
          normal: hitNormal,
        });
      }

      this.getGame().addEvent({
        type: 'shot',
        start: position,
        end: hitPoint || end,
      });
    }
  }
};

module.exports = PlayerMovementComponent;
