/*
module Views {

  export class AutoScrollView extends Simple.View {
    private animation;

    constructor(public el: JQuery) {
      super(el);
    }

    autoscroll(innerEl: JQuery, speed: number) {
      var self = this;
      var start = false;

      if (!this.animation) {
        start = true;
      }

      this.animation = () => {
        var targetTop = (innerEl.height() - this.el.height()) * -1;

        if (targetTop >= 0) {
          this.animation = undefined;
          return;
        }

        var duration = (targetTop * -1 / 100) * speed;

        innerEl.velocity({
          top: targetTop
        },
          {
            duration: duration,
            delay: 1000,
            complete: () => {
              innerEl.css("top", "0px");
              self.animation();
            }
          });
      };
      if (start) {
        this.animation();
      }
    }

  }

}
*/
