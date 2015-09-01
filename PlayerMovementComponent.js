var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2;

var EntityComponent = require('./EntityComponent');

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

    var xvel = 0;
    var yvel = 0;
    if (input_state.left) {
      xvel += -1;
    }
    if (input_state.right) {
      xvel += 1;
    }
    if (input_state.forward) {
      yvel += -1;
    }
    if (input_state.backward) {
      yvel += 1;
    }

    var vel = new b2Vec2(xvel, yvel);
    vel.Normalize();
    vel.Multiply(this.speed);

    body.SetLinearVelocity(vel);

    if (input_state.fire && this.nextFireTime <= 0) {
      this.nextFireTime = this.fireInterval;
      var world = body.GetWorld();

      var position = body.GetPosition();
      var angle = body.GetAngle();
      var length = this.range;
      var end = new b2Vec2(position.x + length * Math.cos(angle), position.y + length * -Math.sin(angle));
      var hitPoint = end;

      console.log('shooting', position, end);
      var callback = (fixture, point, normal, fraction) => {
        if (fixture.IsSensor()) {
          return fraction;
        }

        hitPoint = point;

        var body = fixture.GetBody();
        var entity = body.GetUserData();

        if (entity) {
          var shot_result = entity.onShot({
            from: this.getEntity(),
            point: point,
            normal: normal,
          });

          if (shot_result.ignore) {
            return fraction;
          }
        }

        return 0;
      };
      world.RayCast(callback, position, end);

      this.getGame().addEvent({
        type: 'shot',
        start: position,
        end: hitPoint,
      });
    }
  }
};

module.exports = PlayerMovementComponent;
