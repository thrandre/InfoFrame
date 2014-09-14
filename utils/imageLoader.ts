module Utils {

    export class ImageLoader {

        public load( photoData: Artwork.PhotoData ): JQueryPromise<any> {
            var deferred = $.Deferred();

            var image = new Image();

            var interval = window.setInterval(() => {
                if (image.complete) {
                    window.clearInterval(interval);
                    deferred.resolve();
                }
            }, 500 );

            image.src = photoData.source_large;

            return deferred.promise();
        }

    }

}