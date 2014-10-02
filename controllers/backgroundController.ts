module Controllers 
{

    export class BackgroundController extends Simple.Controller 
	{

        constructor( private photoProvider: Artwork.IPhotoProvider ) 
		{
            super();
        }

        public getPhotos( minWidth: number, minHeight: number ): JQueryPromise<Artwork.PhotoData[]> {
            return this.photoProvider.search( minWidth, minHeight );
        }

    }

}