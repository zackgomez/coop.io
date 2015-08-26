var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2;

var EntityComponent = require('./EntityComponent');

class PlayerMovementComponent extends EntityComponent {
  constructor(options) {
    super(options);
    options = options || {};
    this.player = options.player || null;

    this.fireInterval = options.fireInterval || 1;
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
    var speed = 12;
    if (input_state.left) {
      xvel += -speed;
    }
    if (input_state.right) {
      xvel += speed;
    }
    if (input_state.forward) {
      yvel += -speed;
    }
    if (input_state.backward) {
      yvel += speed;
    }

    body.SetLinearVelocity(new b2Vec2(xvel, yvel));

    if (input_state.fire && this.nextFireTime <= 0) {
      //this.nextFireTime = this.fireInterval;
      var world = body.GetWorld();

      var position = body.GetPosition();
      var angle = body.GetAngle();
      var length = 1000;
      var end = new b2Vec2(position.x + length * Math.cos(angle), position.y + length * -Math.sin(angle));

      var callback = (fixture, point, normal, fraction) => {
        if (fixture.IsSensor()) { return fraction; }

        var body = fixture.GetBody();
        var entity = body.GetUserData();

        console.log('hit a body', point, 'pos', position);
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
    }
  }
};

module.exports = PlayerMovementComponent;
