///<reference path="../simple.ts"/>
///<reference path="../controllers/backgroundController.ts"/>
///<reference path="../utils/imageLoader.ts"/>

module Views {

    export class BackgroundView extends Simple.View {

        private photos: Artwork.PhotoData[];
        private currentPhotoSet: Artwork.PhotoData[];
        private currentPhoto: number = 0;

        constructor(public el: JQuery, public mediator: Simple.EventEmitter, public controller: Controllers.BackgroundController, public imageLoader: Utils.ImageLoader) {
            super(el, controller);
            this.initialize();
        }

        initialize() {
            this.mediator.on("tick-background-load", this.getPhotos, this);
            this.mediator.on("environment-update", this.environmentUpdate, this);
            this.mediator.on("tick-background-render", this.render, this);
        }

        getPhotos(): JQueryPromise<any> {
            return this.controller.getPhotos(this.el.width(), this.el.height())
                .then((photos) => this.photos = photos);
        }

        matchTags(wantedTags: string[], tags: string[]) {
            var matches = 0;
            wantedTags.forEach((tag) => {
                if (tags.indexOf(tag) !== -1) {
                    matches++;
                }
            });

            return matches;
        }

        photoIsMatch(wantedTags: string[], tags: string[], fuzzyness: number): boolean {
            return this.matchTags(wantedTags, tags) >= wantedTags.length - fuzzyness;
        }

        updatePhotoSet(tags: string[]) {
            if (isUndefined(this.photos)) {
                return;
            }

            var photoSet = [];

            for (var i = 0; i <= tags.length; i++) {
                photoSet = this.photos
                    .filter( ( photo ) => this.photoIsMatch( tags, photo.tags, i ) );

                if ( !isEmpty( photoSet ) ) {
                    break;
                }
            }

            if (isEmpty(photoSet)) {
                return;
            }

            photoSet.sort((a, b) => {
                return this.matchTags(tags, a.tags) - this.matchTags(tags, b.tags);
            });

            this.currentPhotoSet = photoSet;
            this.currentPhoto = 0;
        }

        getEnvironmentTags(data: EnvironmentData) {
            return [data.season, data.timeOfDay, data.weather];
        }

        environmentUpdate(data: EnvironmentData) {
            if (isUndefinedOrEmpty(this.photos)) {
                this.getPhotos().then(() => this.updatePhotoSet(this.getEnvironmentTags(data)));
                return;
            }

            this.updatePhotoSet(this.getEnvironmentTags(data));
        }

        renderNext() {
            var l1 = this.el.find(".l1");
            var l2 = this.el.find(".l2");

            l2.css({ "background-image": "url(" + this.currentPhotoSet[this.currentPhoto].source + ")" });

            l2.animate({ opacity: 1 }, {
                duration: 1000,
                complete: () => {
                    l1.css({ opacity: 0 });
                    l1.removeClass("l1").addClass("l2");
                    l2.removeClass("l2").addClass("l1");
                }
            });
        }

        render() {
            if (isUndefinedOrEmpty(this.currentPhotoSet)) {
                return;
            }

            if (this.currentPhoto === this.currentPhotoSet.length) {
                this.currentPhoto = 0;
            }

            this.imageLoader
                .load( this.currentPhotoSet[this.currentPhoto] )
                .then(() => {
                    this.renderNext();
                    this.currentPhoto++;
                });
        }

    }

}