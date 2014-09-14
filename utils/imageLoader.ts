module Utils {

    export class ImageLoader {

        public load( photoData: Artwork.PhotoData ): JQueryPromise<any> {
            var deferred = $.Deferred();

            var image = new Image();

            image.onload = (e) => {
                deferred.resolve();
            };

            image.src = photoData.source_large;

            return deferred.promise();
        }

    }

}