module Utils {

    export class ImageLoader {

        public load( photoData: Artwork.PhotoData ): JQueryPromise<any> {
            var deferred = $.Deferred();
            var image = $( "<img src=\"" + photoData.source + "\"/>" );
            image.load( () => {
                deferred.resolve();
                image.remove();
            });
            return deferred.promise();
        }

    }

}